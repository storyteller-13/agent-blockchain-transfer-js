/**
 * Vercel Cron: run one poll cycle. Configure in vercel.json and set env (RESEND_API_KEY, NOTIFY_EMAIL, CONFIG_JSON, optional KV + CRON_SECRET).
 */

import { loadAddressConfig, runOneTickWithCheckpoint } from '../src/index.js';
import { loadCheckpoint, saveCheckpoint } from '../src/checkpoint.js';

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.NOTIFY_EMAIL;
    if (!apiKey || !notifyEmail) {
      return res.status(500).json({ error: 'Missing RESEND_API_KEY or NOTIFY_EMAIL' });
    }

    const cfg = loadAddressConfig();
    const hasAny =
      cfg.bitcoin.length || cfg.ethereum.length || cfg.cardano.length ||
      cfg.ton.length || cfg.tron.length || cfg.near.length || cfg.zcash.length || cfg.xrp.length;
    if (!hasAny) {
      return res.status(500).json({ error: 'No addresses in config (set CONFIG_JSON)' });
    }

    const previousCheckpoint = await loadCheckpoint();
    const newCheckpoint = await runOneTickWithCheckpoint({
      addressConfig: cfg,
      apiKey,
      notifyEmail,
      fromEmail: process.env.FROM_EMAIL || 'Alerts <onboarding@resend.dev>',
      previousCheckpoint,
    });
    await saveCheckpoint(newCheckpoint);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[cron]', err);
    return res.status(500).json({ error: err.message });
  }
}
