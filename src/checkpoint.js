/**
 * Load/save checkpoint for serverless (e.g. Vercel cron).
 * Uses Vercel KV when KV_REST_API_URL and KV_REST_API_TOKEN are set.
 */

const KEY = 'blockchain-alert:checkpoints';

export async function loadCheckpoint() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  try {
    const { kv } = await import('@vercel/kv');
    const raw = await kv.get(KEY);
    if (raw == null) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error('[checkpoint] load failed', err.message);
    return null;
  }
}

export async function saveCheckpoint(checkpoint) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return;
  }
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(KEY, JSON.stringify(checkpoint));
  } catch (err) {
    console.error('[checkpoint] save failed', err.message);
  }
}
