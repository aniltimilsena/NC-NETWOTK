---
trigger: always_on
---

# Production Data Policy: No Mock / Placeholder Data

1. **Never add mock, fake, test, placeholder, or hardcoded production data.**
2. **Always use the actual Firebase/Firestore, Clerk, Express, and existing application data flow.**
3. **Do not create fake users, profiles, casting calls, reviews, messages, followers, statistics, or images to make the UI appear complete.**
4. **If real data is unavailable, show the proper empty/loading/error state.**
5. **Do not remove or alter mock data that is intentionally required for automated tests or local development fixtures.**
