import { ComponentType, lazy } from 'react';


export function lazyWithRetry(
  componentImport: () => Promise<{ default: ComponentType<any> }>
) {
  return lazy(async () => {
    
    const importKey = componentImport.toString().replace(/[^a-zA-Z0-9]/g, '_');
    const hasRetriedKey = `nc_retry_${importKey}`;
    
    try {
      const result = await componentImport();
      
      sessionStorage.removeItem(hasRetriedKey);
      return result;
    } catch (error: any) {
      console.error("Failed to load dynamically imported module chunk:", error);

      
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
          
          
          sessionStorage.removeItem("vite_reload_time");
          
          
          const url = new URL(window.location.href);
          url.searchParams.set('reload', Date.now().toString());
          window.location.href = url.toString();
          
          
          
          return new Promise<{ default: ComponentType<any> }>(() => {});
        }
      }

      
      
      sessionStorage.removeItem(hasRetriedKey);
      throw error;
    }
  });
}
