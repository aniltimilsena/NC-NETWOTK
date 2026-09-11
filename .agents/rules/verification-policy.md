# Verification Policy: Mandatory Post-Change Validation

After making ANY change in the NC Network codebase, you MUST rigorously verify the implementation before concluding the task.

1. **Mandatory Checklist:**
   - **Build:** Run `npm run build` to confirm production bundle builds without errors.
   - **TypeScript:** Run `npx tsc --noEmit` to ensure zero compilation or type errors.
   - **ESLint / Imports:** Check for broken imports, unused variables, and lint errors.
   - **Console & Runtime Errors:** Verify there are no uncaught exceptions or runtime breakages.
   - **Listeners & Subscriptions:** Ensure no duplicate listeners or uncleaned subscriptions are introduced.
   - **Render Cycles:** Verify there are no infinite render loops or runaway effect executions.
   - **Database & Network Efficiency:** Confirm no unnecessary or duplicate Firestore reads or API requests occur.
   - **Routing & Navigation:** Verify that modified paths, parameters, and redirects behave correctly.
   - **Existing Functionality:** Ensure existing behavior, empty states, and regression tests pass (`npm run test`).

2. **Honesty & Evidence:**
   - Never claim something is fixed or verified without running the actual check.
   - Always report exactly what was tested, the commands executed, the outputs, and any remaining caveats or open items.
