// api/debug.js
// Diagnostic endpoint to check jose JWT verification.

import * as jose from 'jose';

export default async function handler(req, res) {
  const diagnostics = {
    status: 'ok',
    joseSupported: false,
    error: null,
  };

  try {
    const JWKS = jose.createRemoteJWKSet(
      new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
    );
    diagnostics.joseSupported = typeof JWKS === 'function';
  } catch (err) {
    diagnostics.error = {
      message: err.message,
      stack: err.stack,
    };
  }

  res.status(200).json(diagnostics);
}
