# Server-Side SEO Recommendations for NepalCasts

Currently, NepalCasts uses a client-side `<SEO>` component (`src/components/SEO.tsx`) that updates the document title, meta tags, and appends JSON-LD structured data dynamically on the client via `useEffect`.

While this is highly effective for browser search crawlers like Googlebot (which execute Javascript), **it does not support crawlers that bypass JS execution**. These include:
- Social media link previews (Facebook, Twitter/X, LinkedIn, Slack, Discord, Telegram, WhatsApp)
- Lightweight search spiders

To resolve this, we recommend adopting one of the following architectural models for public casting calls (`/casting/:id`) and public profiles (`/profile/:id`):

---

## Recommended Options

### Option A: Cloudflare Workers for Edge OG Tag Injection (Recommended / Low Cost)
If you deploy your client build to static hosting (Vercel, Firebase Hosting, Netlify), you can place a Cloudflare Worker proxy in front of the public routes.
1. The Worker intercepts incoming requests to `/casting/*` or `/profile/*`.
2. If the request is from a known crawler (detected via `User-Agent` like `twitterbot`, `facebookexternalhit`, etc.), the worker fetches the Firestore data via the REST API.
3. It templates the corresponding meta tags (`og:title`, `og:description`, `og:image`) and returns a bare HTML document containing only the tags.
4. If it's a real user, it simply streams the static `index.html` from your origin.

*Advantages:* No changes to existing React build pipeline; 100% decoupling; ultra-fast edge execution.

### Option B: Vite SSR / Server-Side Rendering
If you want to migrate to full server-side rendering:
1. Re-configure your Vite setup using a Node/Express server to render the React application to string via `ReactDOMServer.renderToString()`.
2. Extract SEO context during render and template them directly into the index.html payload.

*Advantages:* Complete consistency; search engines index identical parsed HTML structure.
*Disadvantages:* Substantial refactoring; requires migrating from standard Single Page App (SPA) hosting to node-ready servers (such as GCP App Engine, Cloud Run).

---

## Schema.org Verification Checklist
When creating or modifying schema markup for Casting Calls:
- Ensure `JobPosting` has `hiringOrganization`, `jobLocation`, and `title`.
- Use the `baseSalary` property when budget info is present to gain additional exposure in Google Jobs search result lists.
