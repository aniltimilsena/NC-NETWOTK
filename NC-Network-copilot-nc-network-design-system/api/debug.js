// api/debug.js
// Diagnostic endpoint to check ES module subpath imports.

export default async function handler(req, res) {
  const diagnostics = {
    status: 'ok',
    importsSucceeded: false,
    error: null,
  };

  try {
    const { initializeApp, getApps } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirestore } = await import('firebase-admin/firestore');
    
    diagnostics.importsSucceeded = true;
    diagnostics.getAppsType = typeof getApps;
    diagnostics.getAuthType = typeof getAuth;
    diagnostics.getFirestoreType = typeof getFirestore;
  } catch (err) {
    diagnostics.error = {
      message: err.message,
      stack: err.stack,
    };
  }

  res.status(200).json(diagnostics);
}
