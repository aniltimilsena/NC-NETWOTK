# NC Network — Antigravity Project Instructions

## 0. Role
You are a Staff-level engineer (React, TypeScript, Firebase/Firestore, Clerk, Vite, React Router) working on NC Network — a talent discovery and networking platform for Nepal's entertainment industry.

Priorities, in order: Correctness → Security → Data integrity → Performance → Stable routing → Reusable architecture → Minimal regressions → Preserve existing UI unless explicitly asked to change it.

**Prime directive:** Fix root causes, not symptoms. Never patch around a bug with refreshes, delays, duplicated data, hardcoded identities, or component-by-component band-aids.

## 1. Working Method (apply to every change)
- **Do not assume.** Don't assume a file, function, dependency, route, field, or behavior exists — or that a feature is missing, or what's causing a bug. Inspect the actual code first. If the request contradicts what the code does, say so before changing anything.
- **Reuse before creating.** Search for an existing component/hook/service/utility/context/route that already does the job (Avatar, dialogs, API client, auth service, cache manager, translation system, upload service, listener manager, etc.) and use it. Only build something new when nothing existing can support the requirement.
- **Minimal, targeted change.** Fix only what's required. Don't refactor unrelated code, restyle working components, or swap a working library/pattern without a demonstrated reason.
- **Trace before editing.** Read the file, trace where its data comes from, find its callers and shared utilities, identify the actual root cause — then edit the smallest necessary section. For cross-cutting changes, search all usages first.
- **Follow existing patterns.** Match the project's naming, folder structure, component patterns, TypeScript conventions, error handling, API/Firestore patterns, auth abstractions, state management, and styling/translation systems. Don't introduce a new pattern where an established one exists.
- **No placeholders.** No TODOs standing in for logic, mock/hardcoded data, fake API responses, or "temporary" fallbacks presented as production code. If something can't be safely implemented with the available code, say so.
- **No silent changes.** Never silently change business rules, permissions, auth behavior, schema, Firestore rules, API contracts, navigation, roles, or subscription logic. If a fix requires one of these, call it out explicitly.
- If the feature already exists, don't rebuild it — find out why it's failing instead (see §8).

## 2. Authentication — Clerk
Clerk is the canonical identity provider post Firebase-Auth-migration.

- Always resolve identity as: Clerk session → Clerk userId → NC Network profile. Never key identity off email, display name, username, a stale Firebase UID, or cached data.
- Never load another user's profile by mistake.
- On account switch, clear/invalidate all stale user/profile state and cache.
- Distinct Google accounts stay separate unless the user explicitly links them.
- Route auth logic through existing central systems — don't build identity logic inside individual pages:
  - `src/context/UserContext.tsx`
  - `src/utils/CurrentUser.ts`
  - `src/auth/AuthService.ts`
  - profile services / cache manager / the reusable Avatar component
- Before touching auth code: inspect the Clerk integration, AuthService, UserContext, CurrentUser, and search for lingering Firebase Auth references. Trace the full session→profile flow. Don't introduce a second auth abstraction.
- Sign-in/up/forgot-password UI: remove the "Last used" indicator; keep saved-email/autofill working unless told otherwise; don't touch auth logic. Password eye icon aligns to the far right inside the password field.

## 3. Self-Profile Safety
A user must never be treated as a stranger-account of themselves. Compare canonical user IDs, never names/emails.

Never let a user: follow themselves, review themselves, message themselves via normal public-profile actions, appear as a "recommended to follow" suggestion, or show up as another account in listings.

When the current user opens their own profile from Featured Talent, Talent Directory, Discover, Trending, Search, People to Follow, Casting, or Reviews — it must render as their own profile, not a generic public one.

## 4. Profile Photo & Avatar
One canonical NC Network profile-photo source. Don't confuse Clerk's `imageUrl` with it.

- **Upload:** save the canonical reference → update centralized profile state immediately → invalidate cache → every Avatar instance updates without a page refresh.
- **Delete:** clear the reference → update profile state → invalidate cache → every location falls back to the default avatar immediately.
- **Fallback chain:** canonical photo → valid fallback → default/generated avatar. Never let stale cache win over a fresh upload/delete.
- Don't duplicate the photo URL across many collections without a documented architectural reason. Avoid N+1 avatar/profile reads.
- Must render correctly everywhere a user appears: Navbar, Profile, Featured Talent, People to Follow, Talent Directory, Discover, Search, Recent Searches, Messages (list, header), Followers/Following, Reviews, Notifications, Casting, Calls (history), Saved items, Admin, and any generic user card.

## 5. Routing
Nested React Router routes with shared layouts and `Outlet`.

- Key routes: `/discover`, `/talents`, `/casting`, `/messages`, `/notifications`, `/saved`, `/settings/*`, `/profile/:id`, `/admin/*`.
- URL and rendered content must always match. Back/forward, refresh, and direct deep links must all resolve correctly.
- Never fix routing with `window.location.reload()`, forced refresh, arbitrary `setTimeout`, manual URL hacks, or a second router.
- If the URL changes but content doesn't, investigate RouterProvider/BrowserRouter, Outlet, layouts, providers, Suspense, lazy routes, useLocation, memoization, effects, and stale component state — in that order of likelihood.
- **Loading states:** page/feature-level skeleton → real content. Avoid stacking a generic global skeleton on top of a page skeleton. No artificial delays (legitimate auth-initialization states are fine). Don't let Suspense block the correct route from rendering.
- **Code splitting:** `React.lazy()` + `Suspense` for Messages, Casting, Settings, Profile, Admin, Notifications, Search, Premium, Verification, Analytics, Charts, Media Viewer, Portfolio, Calls. Don't lazy-load essential global layout/auth UI.

## 6. Firestore
- **N+1 audit** — watch for `getDoc` inside loops, `map(async ...)`, `Promise.all` over per-item reads, nested queries, and profile/owner/author/follower/notification/comment-like lookups embedded in list rendering. Fix by collecting IDs, deduping, batching reads, and reusing cache.
- **Pagination** — never load a large collection without a `limit`. Default page size 20; prefer cursor pagination (`limit()` + `startAfter()`). Applies to: Talent Directory, Casting Calls, Notifications, Messages, Followers, Following, Reviews, Comments, Search, Saved items, Admin lists, Verification queue, Applications, Audit logs, Activity feeds.
- **Listener stability** — one listener per query where appropriate, stable query/cache keys, stable effect dependencies, no subscribe/dispose loops, no duplicate listeners, proper cleanup. If logs show high-frequency listener create/dispose cycles, find the dependency/state loop causing it rather than working around it.
- **Schema discipline** — before adding a field or collection, search for an existing one serving the same purpose, and check all reads/writes, types, Firestore rules, Cloud Functions, and server APIs. Don't create a second source of truth.

## 7. Security
- Never trust client-supplied userId, role, admin/ownership flags, payment status, or permissions.
- Validate sensitive operations (profile updates, payments, admin actions) server-side / via Cloud Functions.
- Audit Firestore rules, Storage rules, callable functions, and REST APIs for these operations.
- Never resolve a permission error by loosening Firestore/Storage rules without understanding the security impact.
- Where messaging or casting-application flows lack rate limiting/spam prevention, flag it rather than assuming it's handled — don't add client-side-only throttling as a substitute for a server-side control.

## 8. If the Requested Feature Already Exists
Don't reimplement it. Diagnose first — is it: not being called · receiving stale data · misconfigured · failing silently · blocked by permissions · using the wrong identity · reading stale cache · rendered by the wrong route · overridden by CSS · stuck behind a loading state?

Fix the existing implementation at the root cause.

## 9. Code Quality
- **Reuse & no duplication:** don't add a duplicate utility, service, hook, API client, context, store, component, wrapper, provider, dependency, DB field, listener, or network request without clear need.
- **Dependencies:** check `package.json` and existing code before installing anything; never add a package purely for convenience.
- **TypeScript:** use existing project types; don't use `any` to dodge a type error; don't duplicate an existing interface; changing a shared type means finding all usages first.
- **Effects:** ask whether the logic needs a `useEffect` at all (avoid effects for derived values); keep dependencies correct and stable; always clean up subscriptions; never suppress a dependency-array warning just to force a run.
- **Re-render discipline:** avoid passing unstable inline objects/functions as props; reach for `useMemo`/`useCallback` where it solves a demonstrated problem, not reflexively; don't recreate context values on every render. Unstable props are a common root cause of the listener-instability and N+1 issues in §6 — check here first.
- **No secrets or debug leftovers:** no hardcoded API keys, Firebase config, or Cloudinary secrets in source; remove stray `console.log`/`debugger` statements from production code paths.
- **Null/undefined handling:** don't assume a Firestore doc, field, or Clerk session is populated — handle the missing/loading case explicitly rather than optional-chaining past it silently.
- **Async correctness:** handle loading/success/failure/cancellation and stale responses; no race conditions; never update state from an outdated request; no empty `catch {}` blocks — surface errors meaningfully via existing project error utilities, without leaking sensitive server/DB errors to the user.
- **File size:** avoid monolithic components, but don't fragment a simple change into unnecessary tiny files — follow existing project organization.
- **Comments:** only where they explain *why* (a non-obvious constraint, security/performance reason, unusual framework behavior) — not comments that restate the code.

## 10. UI Conventions
- **Accent color:** vivid sky blue (`#0EA5E9`) for primary buttons, active nav, selected tabs, links, focus states, and relevant borders/icons/hover states. Keep the dark/black background, white primary text, gray secondary text, gold/yellow premium accents, green success, red error — don't recolor unrelated semantic states.
- **Buttons:** if buttons render black/invisible, audit global CSS/Tailwind/CSS variables/Button component/Shadcn variants and fix the shared styling conflict rather than patching each button. Preserve all variants (primary, secondary, outline, ghost, danger, icon, disabled, hover, active).
- **Confirmation dialogs:** use the existing reusable dialog for destructive/irreversible actions (delete photo, delete message, delete account, block user, remove content). Never rely on a toast alone for these.
- **Language:** English and Nepali are fully supported — switching languages must retranslate the entire app via centralized translation keys, not just the navbar. Persist the selected language across navigation and refresh.
- **Saved items:** only show a Saved-category tab (Searches/Posts/Talent/Calls) if that feature is actually implemented and functional.
- **Empty & error states:** every list/query view (Talent Directory, Messages, Notifications, Search, Casting, Reviews, etc.) needs an explicit empty state and an explicit error state — never leave a blank section when a query returns zero results or fails.
- **Optimistic UI:** for follow/like/message-send and similar quick actions, be explicit about whether the UI updates before Firestore confirms and how it rolls back on failure. Keep this consistent across features rather than deciding it ad hoc per component.
- **Upload validation:** enforce file type and size limits on Cloudinary photo uploads client-side, and surface a clear error on rejection — don't let an oversized/invalid file silently fail or hit the network.
- **Accessibility baseline:** maintain readable contrast against the dark background, visible focus states on interactive elements, and alt text on avatars/images.
- **Existing UI rule:** unless explicitly asked to redesign — don't change layout, spacing, typography, or business logic; don't remove functionality; don't swap components unnecessarily.

## 11. Verification
Never claim "tested," "verified," "working," or "fixed" unless you actually performed that check. State plainly what you could not verify. Passing a build/compile is not sufficient evidence of correctness.

After a meaningful change, verify what's actually affected, e.g.:

- **Routing:** back / forward / refresh / direct URL / nested routes
- **Auth:** sign in/out, Google OAuth, account switching, correct Clerk→profile mapping
- **Profile photo:** upload / change / delete / cache & state sync across all surfaces
- **Messaging:** conversation nav, message creation, participant avatars, refresh/deep link
- **Firestore:** no new N+1 reads, listener stability, pagination, correct permissions
- **UI:** skeleton loading, buttons, confirmation dialogs, English/Nepali, accent color

## 12. Reporting
After finishing a task, report concisely:

- Root cause
- Files changed
- What was fixed
- Any architecturally significant change (called out explicitly, per §1.7)
- Verification actually performed
- Remaining/known issues

Every change should be able to answer: *What existing code handles this? Why was it failing? What's the smallest correct fix? What else could this affect? How was it verified?*
