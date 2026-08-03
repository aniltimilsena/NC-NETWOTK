import { useEffect } from 'react';

const DEFAULT_TITLE = 'NepalCasts — Talent Discovery & Casting Calls Near Me';
const DEFAULT_DESCRIPTION =
  'Find casting calls near me, apply to local auditions across cities, and discover premium verified talent on NepalCasts.';
const DEFAULT_IMAGE = 'https://nepalcasts.com/og-default.jpg';
const SITE_NAME = 'NepalCasts';
const TWITTER_HANDLE = '@nepalcasts';

interface SEOProps {
  /** Page-specific title. Gets suffixed with "| NepalCasts" automatically. */
  title?: string;
  /** Page-specific meta description. Falls back to site default. */
  description?: string;
  /** Absolute URL to OG/Twitter share image. Falls back to site default. */
  image?: string;
  /** Canonical URL of the page. Falls back to window.location.href. */
  url?: string;
  /** Optional JSON-LD structured data object (will be serialised to <script type="application/ld+json">). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: Record<string, any>;
  /** When true, injects "noindex, nofollow" robots meta (e.g. auth pages, private dashboards). */
  noindex?: boolean;
}

/**
 * Sets document title, meta description, Open Graph / Twitter tags,
 * and optional JSON-LD schema. Cleans up on unmount so stale tags
 * don't leak onto routes that don't render <SEO>.
 *
 * Note: this is a client-side (useEffect) implementation. Crawlers
 * that don't execute JS (some social/link-preview bots) won't see
 * these tags — for full coverage, pair with SSR/prerendering on
 * public-facing pages (casting calls, profiles) where social shares
 * and search visibility matter most.
 */
export default function SEO({
  title,
  description,
  image,
  url,
  schema,
  noindex = false,
}: SEOProps): null {
  useEffect(() => {
    const resolvedTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
    const resolvedDescription = description || DEFAULT_DESCRIPTION;
    const resolvedImage = image || DEFAULT_IMAGE;
    const resolvedUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    document.title = resolvedTitle;

    const setMeta = (attr: string, key: string, content: string): HTMLMetaElement => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
      return el;
    };

    // Core meta
    setMeta('name', 'description', resolvedDescription);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:title', resolvedTitle);
    setMeta('property', 'og:description', resolvedDescription);
    setMeta('property', 'og:image', resolvedImage);
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');
    setMeta('property', 'og:image:type', resolvedImage.endsWith('.png') ? 'image/png' : 'image/jpeg');
    if (resolvedUrl) {
      setMeta('property', 'og:url', resolvedUrl);
    }

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    if (TWITTER_HANDLE) {
      setMeta('name', 'twitter:site', TWITTER_HANDLE);
    }
    setMeta('name', 'twitter:title', resolvedTitle);
    setMeta('name', 'twitter:description', resolvedDescription);
    setMeta('name', 'twitter:image', resolvedImage);

    // Canonical link
    if (resolvedUrl) {
      let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', resolvedUrl);
    }

    // JSON-LD structured data
    const existingScript = document.querySelector('#seo-schema');
    if (existingScript) {
      document.head.removeChild(existingScript);
    }
    if (schema) {
      const script = document.createElement('script');
      script.id = 'seo-schema';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    return () => {
      // Reset to sensible defaults on unmount so no stale
      // page-specific data leaks onto the next route.
      document.title = DEFAULT_TITLE;
      setMeta('name', 'description', DEFAULT_DESCRIPTION);
      setMeta('name', 'robots', 'index, follow');
      setMeta('property', 'og:title', DEFAULT_TITLE);
      setMeta('property', 'og:description', DEFAULT_DESCRIPTION);
      setMeta('property', 'og:image', DEFAULT_IMAGE);
      setMeta('property', 'og:image:width', '1200');
      setMeta('property', 'og:image:height', '630');
      setMeta('property', 'og:image:type', 'image/jpeg');
      setMeta('name', 'twitter:title', DEFAULT_TITLE);
      setMeta('name', 'twitter:description', DEFAULT_DESCRIPTION);
      setMeta('name', 'twitter:image', DEFAULT_IMAGE);

      const s = document.querySelector('#seo-schema');
      if (s) document.head.removeChild(s);
    };
  }, [title, description, image, url, schema, noindex]);

  return null;
}
