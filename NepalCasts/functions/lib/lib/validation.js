"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAdmin = exports.assertConversationParticipant = exports.assertAuth = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const logger = __importStar(require("firebase-functions/logger"));
const db = (0, firestore_1.getFirestore)();
const assertAuth = (auth) => {
    if (!auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    return { uid: auth.uid, token: auth.token ?? {} };
};
exports.assertAuth = assertAuth;
const assertConversationParticipant = async (conversationId, uid) => {
    const convoRef = db.collection("conversations").doc(conversationId);
    const convoSnap = await convoRef.get();
    if (!convoSnap.exists) {
        throw new https_1.HttpsError("not-found", "Conversation not found");
    }
    const participants = convoSnap.data()?.participants;
    if (!Array.isArray(participants) || !participants.includes(uid)) {
        throw new https_1.HttpsError("permission-denied", "Not a participant of this conversation");
    }
    return { convoRef, participants: participants };
};
exports.assertConversationParticipant = assertConversationParticipant;
const assertAdmin = async (auth) => {
    if (auth.token.admin === true) {
        return;
    }
    const userDoc = await db.collection("users").doc(auth.uid).get();
    if (userDoc.exists && userDoc.data()?.isAdmin === true) {
        try {
            await (0, auth_1.getAuth)().setCustomUserClaims(auth.uid, { admin: true });
        }
        catch (err) {
            logger.error(`Failed to auto-set custom claim for user ${auth.uid}:`, err);
        }
        return;
    }
    throw new https_1.HttpsError("permission-denied", "Admin role required");
};
exports.assertAdmin = assertAdmin;
//# sourceMappingURL=validation.js.map