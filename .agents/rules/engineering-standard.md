# NC Network Master Engineering Standard

This standard applies to all engineering work across the NC Network repository.

1. **Production Quality Only**:
   - Write clean, robust, type-safe, and production-grade code.
   - Preserve existing application architecture, patterns, and working functionality.

2. **Reuse & Consolidation**:
   - Always reuse existing, working canonical implementations instead of creating parallel code.
   - Inspect existing implementations thoroughly before writing new code.
   - No duplicate logic, duplicate utilities, or redundant components.

3. **Production Data Policy**:
   - Never add mock, fake, test, placeholder, or hardcoded production data.
   - Always use actual Firebase/Firestore, Clerk, Express, and application data flows.
   - If data is unavailable, display proper loading, empty, or error states.

4. **Zero Bloat & Dead Code**:
   - No dead code, unused imports, unused variables, or unreachable blocks.
   - No unnecessary files, abstractions, or wrapper layers.
   - No unnecessary dependencies or bloated packages.

5. **Runtime & State Discipline**:
   - Make the smallest correct change that completely solves the problem.
   - No assumptions; investigate and confirm before acting.
   - No hacks, random timeouts, forced page reloads, or UI tricks.
   - No duplicated Firebase initialization or client instances.
   - No duplicated Firestore listeners (always pool or clean up subscriptions).
   - No unnecessary database requests or redundant API calls.

6. **Workflow & Verification**:
   - **Before coding**: Inspect the existing implementation.
   - **After coding**: Rigorously verify the result (`npm run build`, `npx tsc --noEmit`, `npm run test`, and console check).
