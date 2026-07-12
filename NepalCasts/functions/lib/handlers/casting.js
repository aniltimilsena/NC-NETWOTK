"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSetCastingPriority = exports.adminDeleteCastingCall = exports.adminUpdateCastingCall = exports.adminCreateCastingCall = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const config_1 = require("../config");
const validation_1 = require("../lib/validation");
const rateLimit_1 = require("../lib/rateLimit");
const schemas_1 = require("../schemas");
exports.adminCreateCastingCall = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    await (0, validation_1.assertAdmin)(authCtx);
    const parsed = schemas_1.AdminCastingSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid casting call payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "adminCreateCastingCall", 30, 60);
    const payload = {
        ...parsed.data,
        status: "Open",
        createdBy: authCtx.uid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    const docRef = await config_1.db.collection("casting_calls").add(payload);
    await (0, rateLimit_1.logSecurityEvent)("casting.admin.create", "info", authCtx.uid, { castingCallId: docRef.id });
    return { id: docRef.id, success: true };
});
exports.adminUpdateCastingCall = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    await (0, validation_1.assertAdmin)(authCtx);
    const parsed = schemas_1.AdminCastingUpdateSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid casting call update payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "adminUpdateCastingCall", 40, 60);
    const { id, ...rest } = parsed.data;
    await config_1.db.collection("casting_calls").doc(id).set({
        ...rest,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: authCtx.uid,
    }, { merge: true });
    await (0, rateLimit_1.logSecurityEvent)("casting.admin.update", "warning", authCtx.uid, { castingCallId: id, changedKeys: Object.keys(rest) });
    return { success: true };
});
exports.adminDeleteCastingCall = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    await (0, validation_1.assertAdmin)(authCtx);
    const parsed = schemas_1.AdminCastingDeleteSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid casting call delete payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "adminDeleteCastingCall", 20, 60);
    await config_1.db.collection("casting_calls").doc(parsed.data.id).delete();
    await (0, rateLimit_1.logSecurityEvent)("casting.admin.delete", "critical", authCtx.uid, { castingCallId: parsed.data.id });
    return { success: true };
});
exports.adminSetCastingPriority = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    await (0, validation_1.assertAdmin)(authCtx);
    const parsed = schemas_1.AdminCastingPrioritySchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid casting priority payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "adminSetCastingPriority", 60, 60);
    await config_1.db.collection("casting_calls").doc(parsed.data.id).set({
        highPriority: parsed.data.highPriority,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: authCtx.uid,
    }, { merge: true });
    await (0, rateLimit_1.logSecurityEvent)("casting.admin.priority", "warning", authCtx.uid, {
        castingCallId: parsed.data.id,
        highPriority: parsed.data.highPriority,
    });
    return { success: true };
});
//# sourceMappingURL=casting.js.map