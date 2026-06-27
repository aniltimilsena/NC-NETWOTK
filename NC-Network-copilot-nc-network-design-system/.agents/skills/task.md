# Security Remediation Task Checklist

## Immediate — Critical (Do Today)
- `[x]` 1. Remove Firebase private key & OneSignal key from `.env` — add `.env.server` pattern
- `[x]` 2. Fix unauthenticated `/api/2fa/verify-otp` endpoint
- `[x]` 3. Fix unauthenticated `/api/2fa/verify-login-otp` endpoint
- `[x]` 4. Restrict `users` collection reads in Firestore rules
- `[x]` 5. Move 2FA secrets out of public `profiles` collection (Firestore rules + server code)
- `[x]` 6. Secure private chat uploads in `Messages.jsx` to use conversation-specific directory path

## This Week — High
- `[x]` 7. Remove client-side `isAdmin` writes from `auth.ts` + block in Firestore rules
- `[x]` 8. Fix Firestore `isAdmin()` function (wrong field check)
- `[x]` 9. Fix casting call ID hijacking in server
- `[x]` 10. Restrict CORS on `api/send-notification.js`
- `[x]` 11. Remove OTP plaintext from server console logs
- `[x]` 12. Fix notification type mismatch in Firestore rules
- `[x]` 13. Fix review update rule (wrong data source)
- `[x]` 14. Fix read receipt field name mismatch
- `[x]` 15. Move Cloudinary credentials out of client-side `VITE_` variables into `.env.server`

## This Sprint — Medium
- `[x]` 16. Add HSTS header to `vercel.json`
- `[x]` 17. Add file size/type limits to Storage rules
- `[x]` 18. Add `uploadLimiter` to avatar/media upload routes
- `[x]` 19. Add Zod schema for admin settings/log endpoints
- `[x]` 20. Add pagination to casting listing
- `[x]` 21. Fix error handler to not expose internals in production
- `[x]` 22. Fix unread count race condition with `FieldValue.increment()`
- `[x]` 23. Add conversation participant validation to storage.rules for chat attachments

## Backlog — Low
- `[x]` 24. Remove `firebase-admin` and `multer` from frontend `package.json`
- `[x]` 25. Add `worker-src 'self'` to CSP
- `[x]` 26. Remove user input from Cloud Functions error logs

## Optimistic Media Upload Feature
- `[ ]` 27. Add clientMsgId to backend MessageSchema and messages database record
- `[ ]` 28. Add clientMsgId support to frontend sendMessage service
- `[ ]` 29. Implement optimistic sendImageMessage and retry uploads in Messages.jsx
- `[ ]` 30. Implement circular SVG progress overlay and failed retry bubble styling in Messages.jsx
