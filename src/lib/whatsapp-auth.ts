/**
 * Mismo token que RomaCrm (ROMA_SYNC_TOKEN / X-Roma-Sync-Token).
 */
export function verifyRomaSyncToken(request: Request): { ok: boolean; error?: string } {
  const expected = process.env.ROMA_SYNC_TOKEN?.trim();
  if (!expected) {
    return { ok: true };
  }

  let token =
    request.headers.get('x-roma-sync-token') ??
    request.headers.get('authorization') ??
    '';

  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  if (!token || token !== expected) {
    return { ok: false, error: 'Unauthorized: invalid or missing ROMA_SYNC_TOKEN' };
  }

  return { ok: true };
}
