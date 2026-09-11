# Minimal Code Policy: Write Only What is Required

For every change in the NC Network codebase, follow these rules:

1. **Write the minimum amount of code required** to correctly solve the problem.
2. **Do NOT add:**
   - Unnecessary abstractions
   - Duplicate state
   - Duplicate API calls
   - Extra `useEffect`
   - Extra `useMemo`
   - Extra `useCallback`
   - Extra context providers
   - Extra services
   - Extra components
   - Unnecessary dependencies
3. **Extend or fix existing code** instead of creating new parallel code whenever possible.
4. **Every new piece of code must have a clear, justifiable purpose.**
