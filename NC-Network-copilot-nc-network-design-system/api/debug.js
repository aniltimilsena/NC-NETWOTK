// api/debug.js
// Safe diagnostic endpoint to check firebase-admin structure using createRequire.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export default async function handler(req, res) {
  const diagnostics = {
    status: 'ok',
    adminKeys: [],
    appsLength: null,
    error: null,
  };

  try {
    const admin = require('firebase-admin');
    diagnostics.adminKeys = Object.keys(admin);
    diagnostics.appsLength = admin.apps ? admin.apps.length : 'no-apps-field';
  } catch (err) {
    diagnostics.error = {
      message: err.message,
      stack: err.stack,
    };
  }

  res.status(200).json(diagnostics);
}
