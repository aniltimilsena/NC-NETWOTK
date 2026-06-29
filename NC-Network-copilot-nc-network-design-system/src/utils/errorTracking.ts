export const initErrorTracking = () => {
  if (typeof window === 'undefined') return;

  // Catch unhandled JS errors
  window.onerror = (message, source, line, col, error) => {
    logError({
      type: 'uncaught',
      message: String(message),
      source: source || 'unknown',
      line: line || 0,
      col: col || 0,
      stack: error?.stack || null,
    });
    return false; // don't suppress error
  };

  // Catch unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError({
      type: 'unhandled_promise',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack || null,
    });
  });

  // Catch network errors
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      // Log server errors (status 500+) except logging requests themselves to prevent infinite loops
      const url = String(args[0]);
      if (!response.ok && response.status >= 500 && !url.includes('/api/errors/log')) {
        logError({
          type: 'api_error',
          url,
          status: response.status,
        });
      }
      return response;
    } catch (error: any) {
      const url = String(args[0]);
      if (!url.includes('/api/errors/log')) {
        logError({
          type: 'network_error',
          url,
          message: error?.message || 'Network connection failed',
        });
      }
      throw error;
    }
  };
};

const logError = async (errorData: any) => {
  // Only log in production
  if (!import.meta.env.PROD) {
    console.error('Error tracked (dev):', errorData);
    return;
  }

  try {
    const { auth } = await import('../lib/firebase');
    const token = await auth.currentUser?.getIdToken().catch(() => null);

    await fetch('/api/errors/log', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify({
        ...errorData,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userId: auth.currentUser?.uid || 'anonymous',
      }),
    });
  } catch {
    // Silent fail
  }
};
