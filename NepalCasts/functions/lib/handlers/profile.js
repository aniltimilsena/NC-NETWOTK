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
exports.upsertProfile = exports.bootstrapUserProfile = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const logger = __importStar(require("firebase-functions/logger"));
const config_1 = require("../config");
const validation_1 = require("../lib/validation");
const rateLimit_1 = require("../lib/rateLimit");
const schemas_1 = require("../schemas");
exports.bootstrapUserProfile = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    const parsed = schemas_1.BootstrapUserSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid user profile payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "bootstrapUserProfile", 5, 60);
    const now = firestore_1.FieldValue.serverTimestamp();
    const profileName = parsed.data.name;
    const role = parsed.data.role ?? "Talent";
    const gender = parsed.data.gender ?? "";
    const authEmail = typeof authCtx.token.email === "string" ? authCtx.token.email : null;
    const email = parsed.data.email ?? authEmail;
    await config_1.db.runTransaction(async (transaction) => {
        const userRef = config_1.db.collection("users").doc(authCtx.uid);
        const profileRef = config_1.db.collection("profiles").doc(authCtx.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
            transaction.set(userRef, {
                uid: authCtx.uid,
                name: profileName,
                email,
                role,
                gender,
                isAdmin: email === "aniltimilsena53@gmail.com",
                createdAt: now,
                updatedAt: now,
            });
        }
        else {
            transaction.set(userRef, {
                name: profileName,
                role,
                gender,
                updatedAt: now,
                isAdmin: email === "aniltimilsena53@gmail.com" ? true : userSnap.data()?.isAdmin ?? false,
            }, { merge: true });
        }
        transaction.set(profileRef, {
            uid: authCtx.uid,
            name: profileName,
            role,
            gender,
            bio: "",
            location: "",
            skills: [],
            experience: [],
            languages: [],
            media: [],
            verified: false,
            updatedAt: now,
        }, { merge: true });
    });
    if (email === "aniltimilsena53@gmail.com") {
        try {
            await (0, auth_1.getAuth)().setCustomUserClaims(authCtx.uid, { admin: true });
        }
        catch (claimErr) {
            logger.error("Failed to set bootstrap custom claim:", claimErr);
        }
    }
    await (0, rateLimit_1.logSecurityEvent)("user.bootstrap", "info", authCtx.uid, { hasEmail: !!email });
    return { success: true };
});
exports.upsertProfile = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    const parsed = schemas_1.ProfileUpdateSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid profile update payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "upsertProfile", 30, 60);
    await config_1.db.collection("profiles").doc(authCtx.uid).set({
        ...parsed.data,
        uid: authCtx.uid,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    await (0, rateLimit_1.logSecurityEvent)("profile.update", "info", authCtx.uid, { keys: Object.keys(parsed.data) });
    return { success: true };
});
//# sourceMappingURL=profile.js.map