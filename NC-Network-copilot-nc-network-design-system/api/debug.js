// api/debug.js
// Diagnostic endpoint to check Node version and import errors.

module.exports = async (req, res) => {
  const diagnostics = {
    nodeVersion: process.version,
    envKeys: Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('PASS') && !k.includes('SECRET')),
    importError: null,
    firebaseApps: 0,
  };

  try {
    const admin = require('firebase-admin');
    diagnostics.firebaseApps = admin.apps.length;
  } catch (err) {
    diagnostics.importError = {
      message: err.message,
      stack: err.stack,
    };
  }

  res.status(200).json(diagnostics);
};
