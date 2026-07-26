import { readFileSync } from 'fs';
import * as path from 'path';
import * as http from 'http';
import { initializeTestEnvironment, RulesTestEnvironment, } from '@firebase/rules-unit-testing';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
let testEnv: RulesTestEnvironment;
let emulatorRunning = false;
const checkEmulator = (): Promise<boolean> => {
    return new Promise((resolve) => {
        const req = http.request({
            host: '127.0.0.1',
            port: 8080,
            path: '/',
            method: 'GET',
            timeout: 1000,
        }, () => {
            resolve(true);
        });
        req.on('error', () => {
            resolve(false);
        });
        req.end();
    });
};
describe('Firestore Security Rules', () => {
    beforeAll(async () => {
        emulatorRunning = await checkEmulator();
        if (!emulatorRunning) {
            console.warn('Firestore emulator is not running on port 8080. Skipping Firestore rules tests.');
            return;
        }
        testEnv = await initializeTestEnvironment({
            projectId: 'nc-network-rules-test',
            firestore: {
                rules: readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8'),
                host: '127.0.0.1',
                port: 8080,
            },
        });
    });
    afterAll(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });
    beforeEach(async () => {
        if (testEnv) {
            await testEnv.clearFirestore();
        }
    });
    it('allows read access to public collections for signed-in users', { skip: !emulatorRunning }, async () => {
        const aliceDb = testEnv.authenticatedContext('alice').firestore();
        await expect(aliceDb.collection('casting_calls').get()).resolves.not.toThrow();
    });
    it('blocks read access to private user documents for other users', { skip: !emulatorRunning }, async () => {
        const bobDb = testEnv.authenticatedContext('bob').firestore();
        await expect(bobDb.collection('users').doc('alice').collection('private').doc('data').get()).rejects.toThrow();
    });
    it('allows owner to read and write to their own private sub-collection', { skip: !emulatorRunning }, async () => {
        const aliceDb = testEnv.authenticatedContext('alice').firestore();
        await expect(aliceDb.collection('users').doc('alice').collection('private').doc('data').set({ secret: 'my-secrets' })).resolves.not.toThrow();
    });
    it('blocks non-admin users from writing to admin logs', { skip: !emulatorRunning }, async () => {
        const aliceDb = testEnv.authenticatedContext('alice').firestore();
        await expect(aliceDb.collection('admin_logs').add({ log: 'unauthorized log' })).rejects.toThrow();
    });
    it('allows admin users (validated via custom claims) to write to admin logs', { skip: !emulatorRunning }, async () => {
        const adminDb = testEnv.authenticatedContext('admin_user', { admin: true }).firestore();
        await expect(adminDb.collection('admin_logs').add({ log: 'authorized admin log' })).resolves.not.toThrow();
    });
    it('blocks client-side updates to isAdmin field in users collection', { skip: !emulatorRunning }, async () => {
        const aliceDb = testEnv.authenticatedContext('alice').firestore();
        await expect(aliceDb.collection('users').doc('alice').set({ isAdmin: true }, { merge: true })).rejects.toThrow();
    });
});
