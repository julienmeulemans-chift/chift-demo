// ── In-memory token cache ─────────────────────────────────────────────────────
let cache = { token: null, expiresAt: 0 };

/**
 * Acquire (or reuse) a Chift access token via client_credentials.
 * @param {object} config  ChiftConfig from context
 * @returns {Promise<string>} Bearer token
 */
export async function getToken(config) {
  const now = Date.now();
  // Return cached token if still valid (with 60 s safety margin)
  if (cache.token && cache.expiresAt > now + 60_000) {
    return cache.token;
  }

  const res = await fetch(`${config.baseUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type:   'client_credentials',
      clientId:     config.clientId,
      clientSecret: config.clientSecret,
      accountId:    config.accountId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Authentication failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  cache = {
    token:     data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return cache.token;
}

/**
 * Build headers for a Chift API request.
 * @param {string} token      Bearer token
 * @param {string} accountId  Chift account ID
 */
export function buildHeaders(token, accountId) {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
    ...(accountId ? { 'X-Account-Id': accountId } : {}),
  };
}

/** Invalidate the cached token (e.g. after credentials change). */
export function invalidateToken() {
  cache = { token: null, expiresAt: 0 };
}

/** API documentation URLs — used in ApiCallLog to make endpoints clickable. */
export const DOC_URLS = {
  token:             'https://docs.chift.eu/developer-guides/create-api-key',
  integrations:      'https://docs.chift.eu/api-reference/endpoints/integrations/get-list-of-integrations',
  consumers_post:    'https://docs.chift.eu/api-reference/endpoints/consumers/create-new-consumer',
  connections_get:   'https://docs.chift.eu/api-reference/endpoints/connections/get-connections',
  connections_post:  'https://docs.chift.eu/api-reference/endpoints/connections/add-new-connection',
  connections_patch: 'https://docs.chift.eu/api-reference/endpoints/connections/update-connection',
  clients:           'https://docs.chift.eu/api-reference/endpoints/accounting/clients/get-list-of-accounting-clients',
  syncs:             'https://docs.chift.eu/api-reference/endpoints/syncs/create-sync-url',
};

/** Extract a count from various API response shapes. */
export function extractCount(data) {
  if (Array.isArray(data))               return data.length;
  if (typeof data?.count  === 'number')  return data.count;
  if (typeof data?.total  === 'number')  return data.total;
  if (Array.isArray(data?.results))      return data.results.length;
  if (Array.isArray(data?.items))        return data.items.length;
  return null;
}

/**
 * Delete a connection for a consumer. Silently ignores errors.
 * @param {object} config
 * @param {string} consumerId
 * @param {string} connectionId
 */
export async function deleteConnection(config, consumerId, connectionId) {
  try {
    const token = await getToken(config);
    const hdrs = buildHeaders(token, config.accountId);
    const res = await fetch(`${config.baseUrl}/consumers/${consumerId}/connections/${connectionId}`, {
      method: 'DELETE',
      headers: hdrs,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => String(res.status));
      throw new Error(`Connection deletion failed (${res.status}): ${text}`);
    }
    return res;
  } catch (err) {
    console.error('deleteConnection error:', err);
    throw err;
  }
}
