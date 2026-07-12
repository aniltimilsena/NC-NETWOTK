"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callableOptions = exports.MAX_FCM_TOKENS = exports.ENFORCE_APP_CHECK = exports.DEFAULT_REGION = exports.auth = exports.db = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
exports.db = (0, firestore_1.getFirestore)();
exports.auth = (0, auth_1.getAuth)();
exports.DEFAULT_REGION = process.env.FUNCTIONS_REGION ?? "us-central1";
exports.ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === "true";
exports.MAX_FCM_TOKENS = 20;
exports.callableOptions = {
    region: exports.DEFAULT_REGION,
    enforceAppCheck: exports.ENFORCE_APP_CHECK,
    maxInstances: 20,
};
//# sourceMappingURL=config.js.map