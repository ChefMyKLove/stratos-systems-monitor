import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const router = Router();

router.get('/patreon/callback', async (req, res) => {
  const { code } = req.query;
  const { clientId, clientSecret, redirectUri, tierIds, stratosUrl } = config.patreon;

  try {
    if (!code) throw new Error('Missing authorization code.');
    if (!clientId || !clientSecret || !config.jwtSecret) {
      throw new Error('Patreon auth is not configured on the server yet.');
    }

    const tokenRes = await fetch('https://www.patreon.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Patreon token exchange failed: ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();

    const identityRes = await fetch(
      'https://www.patreon.com/api/oauth2/v2/identity?include=memberships.currently_entitled_tiers',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!identityRes.ok) throw new Error(`Patreon identity lookup failed: ${identityRes.status}`);
    const identity = await identityRes.json();

    // TEMP: logging to find the admin's Patreon user ID for the allowlist. Remove after use.
    console.log('[auth] patreon identity.data.id =', identity.data?.id, 'full_name =', identity.data?.attributes?.full_name);

    const entitledTierIds = (identity.included || [])
      .filter(item => item.type === 'tier')
      .map(item => item.id);
    const hasAccess = entitledTierIds.some(id => tierIds.includes(id));

    if (!hasAccess) return res.redirect(`${stratosUrl}?auth=denied`);

    const sessionToken = jwt.sign(
      { patreonId: identity.data.id },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    res.redirect(`${stratosUrl}?token=${sessionToken}`);
  } catch (err) {
    console.error('[auth] patreon callback error:', err.message);
    res.redirect(`${stratosUrl}?auth=denied`);
  }
});

export default router;
