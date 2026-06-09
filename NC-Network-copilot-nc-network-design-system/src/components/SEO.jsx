import { useEffect } from 'react';

export default function SEO({ title, description, schema }) {
  useEffect(() => {
    // 1. Update Title
    document.title = title ? `${title} | NC Network` : ' Network — Talent Discovery & Casting Calls Near Me';

    // 2. Update Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description || "Find casting calls near me, apply to local auditions across cities, and discover premium verified talent on NC Network.";

    // 3. Update/Inject JSON-LD Schema (JobPosting, Events, Organization)
    let script = document.querySelector('#seo-schema');
    if (script) {
      document.head.removeChild(script);
    }

    if (schema) {
      script = document.createElement('script');
      script.id = 'seo-schema';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    }
  }, [title, description, schema]);

  return null;
}
