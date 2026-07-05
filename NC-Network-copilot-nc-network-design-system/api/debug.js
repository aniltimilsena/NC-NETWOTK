// api/debug.js
// Safe diagnostic endpoint with ZERO compile-time dependencies.
// Uses dynamic import in try/catch to capture exact runtime errors.

export default async function handler(req, res) {
  const diagnostics = {
    status: 'ok',
    nodeVersion: process.version,
    envKeys: Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('PASS') && !k.includes('SECRET')),
    importError: null,
    firebaseApps: 0,
  };

  try {
    const admin = await import('firebase-admin');
    // CommonJS default export wrapper check
    const firebaseAdmin = admin.default || admin;
    diagnostics.firebaseApps = firebaseAdmin.apps ? firebaseAdmin.apps.length : 'unknown';
  } catch (err) {
    diagnostics.importError = {
      message: err.message,
      stack: err.stack,
    };
  }

  res.status(200).json(diagnostics);
}
