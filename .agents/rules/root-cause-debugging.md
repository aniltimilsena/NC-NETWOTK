# Root Cause Debugging Policy

When fixing bugs in the NC Network codebase, always identify and resolve the **actual root cause** before modifying any code.

1. **Strictly prohibited anti-patterns:**
   - Page reloads (`window.location.reload()`)
   - `setTimeout` / timing hacks to paper over race conditions
   - Forced refreshes or remounting components to reset state
   - Duplicate or redundant API calls to mask out-of-sync data
   - Duplicate listeners or multiple concurrent subscriptions
   - Random delays or arbitrary debounce timeouts
   - Error suppression (empty `.catch(() => {})` that silently hides failures)
   - UI tricks or CSS hacks that merely hide the symptom

2. **Required debugging methodology:**
   - Trace the **actual data flow** from database/API to the UI.
   - Trace the **state flow** and **component lifecycle** (mount, updates, unmount, cleanup).
   - Inspect **network requests and database queries** for exact payloads and error codes.
   - Fix the underlying cause directly at its source.

3. **No guessing:**
   - If the root cause is uncertain, investigate further (using logs, traces, or inspection) rather than guessing or applying speculative patches.
