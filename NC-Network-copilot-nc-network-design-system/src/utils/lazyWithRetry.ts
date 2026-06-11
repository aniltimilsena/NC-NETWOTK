import { ComponentType, lazy } from 'react';

/**
 * A wrapper around React.lazy() that automatically retries the dynamic import
 * once if it fails (e.g. when a new deployment deletes old hashed assets).
 */
export function lazyWithRetry(
  componentImport: () => Promise<{ default: ComponentType<any> }>
) {
  return lazy(async () => {
    // Generate a unique key for sessionStorage based on the import function string representation
    const importKey = componentImport.toString().replace(/[^a-zA-Z0-9]/g, '_');
    const hasRetriedKey = `nc_retry_${importKey}`;
    
    try {
      const result = await componentImport();
      // On success, clean up any previous retry flag for this component
      sessionStorage.removeItem(hasRetriedKey);
      return result;
    } catch (error: any) {
      console.error("Failed to load dynamically imported module chunk:", error);

      // Check if it's a chunk loading failure
      const errorMsg = error?.message || "";
      const isChunkLoadFailed =
        errorMsg.includes("Failed to fetch dynamically imported module") ||
        errorMsg.includes("Importing a module script failed") ||
        errorMsg.includes("error loading dynamically imported module");

      if (isChunkLoadFailed) {
        const hasRetried = sessionStorage.getItem(hasRetriedKey);
        
        if (!hasRetried) {
          sessionStorage.setItem(hasRetriedKey, 'true');
          console.warn("Retrying chunk import by reloading page with cache-busting...");
          
          // Clear Vite preload reload time to allow preload reload if needed
          sessionStorage.removeItem("vite_reload_time");
          
          // Perform hard reload with a cache-busting timestamp
          const url = new URL(window.location.href);
          url.searchParams.set('reload', Date.now().toString());
          window.location.href = url.toString();
          
          // Return an unresolved promise to prevent the React app from crashing
          // or rendering error boundary UI before the reload happens
          return new Promise<{ default: ComponentType<any> }>(() => {});
        }
      }

      // If it's not a chunk failure, or we already retried and it failed again,
      // clean the retry flag and bubble up the error to the Error Boundary
      sessionStorage.removeItem(hasRetriedKey);
      throw error;
    }
  });
}
