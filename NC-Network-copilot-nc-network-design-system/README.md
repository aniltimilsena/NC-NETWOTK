# NC-Network

## Security-hardened backend architecture

Critical writes are now backend-controlled through Firebase Cloud Functions (`functions/src/index.ts`) using:

- **Zero-trust checks**: every callable requires Firebase Auth, validates payloads with Zod, and verifies ownership/participant/admin constraints server-side.
- **RBAC enforcement**: admin-only mutations (`adminCreateCastingCall`, `adminUpdateCastingCall`, `adminDeleteCastingCall`, `adminSetCastingPriority`) require custom claim or `users/{uid}.isAdmin`.
- **Abuse resistance**: per-user rolling rate limits are enforced in Functions (`securityRateLimits`), with explicit `resource-exhausted` failures.
- **Structured security logging**: high-risk actions are logged with severity into `securityEvents` plus Cloud Logging via `firebase-functions/logger`.

### Secure APIs now handling critical operations

- User bootstrap: `bootstrapUserProfile`
- Profile mutation: `upsertProfile`
- Messaging mutation: `createOrGetConversation`, `sendMessage`, `updateMessage`, `deleteMessage`, `reactToMessage`, `pinMessage`, `deleteConversation`, `blockUser`
- Notification token registration: `registerNotificationToken`
- Admin casting controls: `adminCreateCastingCall`, `adminUpdateCastingCall`, `adminDeleteCastingCall`, `adminSetCastingPriority`

Frontend writes for these flows were routed to secure callables via `src/api/functionsClient.ts`.

### Firestore rule posture

`firestore.rules` was tightened to least privilege:

- `users/*`, `conversations/*`, `conversations/*/messages/*`, `castingCalls/*`, `casting_calls/*` are now **backend-write only**.
- Clients retain scoped reads where needed (ownership/participant checks).
- Sensitive/privileged mutations are performed through Cloud Functions (Admin SDK bypasses rules intentionally).

### Secure upload path

Profile media upload now uses authenticated backend upload (`POST /api/upload`) instead of direct unsigned third-party uploads.

### Firebase deployment config

`firebase.json` now declares:

- Functions source: `functions`
- Firestore rules: `firestore.rules`
- Storage rules: `storage.rules`
