import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initEmail, sendTransferAlert } from './email.js';
import { createBitcoinMonitor } from './monitors/bitcoin.js';
import { createEthereumMonitor } from './monitors/ethereum.js';
import { createCardanoMonitor } from './monitors/cardano.js';
import { createTonMonitor } from './monitors/ton.js';
import { createTronMonitor } from './monitors/tron.js';
import { createNearMonitor } from './monitors/near.js';
import { createZcashMonitor } from './monitors/zcash.js';
import { createXrpMonitor } from './monitors/xrp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function arr(config, key) {
  return Array.isArray(config[key]) ? config[key].map((s) => String(s).trim()).filter(Boolean) : [];
}

function applyDisableFlags(cfg) {
  if (process.env.DISABLE_ZCASH === '1' || process.env.DISABLE_ZCASH === 'true') {
    cfg.zcash = [];
  }
  return cfg;
}

export function loadAddressConfig() {
  if (process.env.CONFIG_JSON) {
    try {
      const config = JSON.parse(process.env.CONFIG_JSON);
      return applyDisableFlags({
        bitcoin: arr(config, 'bitcoin'),
        ethereum: arr(config, 'ethereum'),
        cardano: arr(config, 'cardano'),
        ton: arr(config, 'ton'),
        tron: arr(config, 'tron'),
        near: arr(config, 'near'),
        zcash: arr(config, 'zcash'),
        xrp: arr(config, 'xrp'),
      });
    } catch (e) {
      console.error('Invalid CONFIG_JSON:', e.message);
      process.exit(1);
    }
  }
  const configPath = process.env.CONFIG_PATH || join(__dirname, '..', 'config.json');
  let raw;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(
        'Missing config.json and CONFIG_JSON. Copy config.example.json to config.json or set CONFIG_JSON env.'
      );
      process.exit(1);
    }
    throw err;
  }
  const config = JSON.parse(raw);
  return applyDisableFlags({
    bitcoin: arr(config, 'bitcoin'),
    ethereum: arr(config, 'ethereum'),
    cardano: arr(config, 'cardano'),
    ton: arr(config, 'ton'),
    tron: arr(config, 'tron'),
    near: arr(config, 'near'),
    zcash: arr(config, 'zcash'),
    xrp: arr(config, 'xrp'),
  });
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL;
  const fromEmail = process.env.FROM_EMAIL || 'Alerts <onboarding@resend.dev>';
  const pollIntervalSec = Math.max(15, parseInt(process.env.POLL_INTERVAL_SEC || '30', 10));

  if (!apiKey) {
    console.error('Missing RESEND_API_KEY. Copy .env.example to .env and set your Resend API key.');
    process.exit(1);
  }
  if (!notifyEmail) {
    console.error('Missing NOTIFY_EMAIL. Set the email address to receive transfer alerts.');
    process.exit(1);
  }

  const cfg = loadAddressConfig();
  const hasAny =
    cfg.bitcoin.length ||
    cfg.ethereum.length ||
    cfg.cardano.length ||
    cfg.ton.length ||
    cfg.tron.length ||
    cfg.near.length ||
    cfg.zcash.length ||
    cfg.xrp.length;

  if (!hasAny) {
    console.error('Add at least one address (bitcoin, ethereum, cardano, ton, tron, near, zcash, or xrp) in config.json');
    process.exit(1);
  }

  initEmail(apiKey);

  const onTransfer = async (payload) => {
    console.log('[alert]', payload.chain, payload.txHash, '->', payload.address);
    const result = await sendTransferAlert({
      to: notifyEmail,
      from: fromEmail,
      ...payload,
    });
    if (!result.ok) console.error('[alert] email failed', result.error);
  };

  if (cfg.bitcoin.length) console.log('Watching Bitcoin:', cfg.bitcoin);
  if (cfg.ethereum.length) console.log('Watching Ethereum:', cfg.ethereum);
  if (cfg.cardano.length) console.log('Watching Cardano:', cfg.cardano);
  if (cfg.ton.length) console.log('Watching TON:', cfg.ton);
  if (cfg.tron.length) console.log('Watching Tron:', cfg.tron);
  if (cfg.near.length) console.log('Watching NEAR:', cfg.near);
  if (cfg.zcash.length) console.log('Watching Zcash:', cfg.zcash);
  if (cfg.xrp.length) console.log('Watching XRP:', cfg.xrp);
  console.log('Poll interval:', pollIntervalSec, 's');
  console.log('Notifications to:', notifyEmail);

  const cp = {};
  const btc = cfg.bitcoin.length ? createBitcoinMonitor({ addresses: cfg.bitcoin, onTransfer, initialCheckpoint: cp.bitcoin }) : null;
  const eth = cfg.ethereum.length ? createEthereumMonitor({ addresses: cfg.ethereum, onTransfer, initialCheckpoint: cp.ethereum }) : null;
  const ada = cfg.cardano.length ? createCardanoMonitor({ addresses: cfg.cardano, onTransfer, initialCheckpoint: cp.cardano }) : null;
  const ton = cfg.ton.length ? createTonMonitor({ addresses: cfg.ton, onTransfer, initialCheckpoint: cp.ton }) : null;
  const trx = cfg.tron.length ? createTronMonitor({ addresses: cfg.tron, onTransfer, initialCheckpoint: cp.tron }) : null;
  const near = cfg.near.length ? createNearMonitor({ addresses: cfg.near, onTransfer, initialCheckpoint: cp.near }) : null;
  const zec = cfg.zcash.length ? createZcashMonitor({ addresses: cfg.zcash, onTransfer, initialCheckpoint: cp.zcash }) : null;
  const xrp = cfg.xrp.length ? createXrpMonitor({ addresses: cfg.xrp, onTransfer, initialCheckpoint: cp.xrp }) : null;

  async function tick() {
    if (btc) await btc.poll();
    if (eth) await eth.poll();
    if (ada) await ada.poll();
    if (ton) await ton.poll();
    if (trx) await trx.poll();
    if (near) await near.poll();
    if (zec) await zec.poll();
    if (xrp) await xrp.poll();
  }

  await tick();
  setInterval(tick, pollIntervalSec * 1000);
}

/**
 * Run one poll cycle with checkpoint in/out for serverless (e.g. Vercel cron).
 * Creates monitors with previousCheckpoint, runs one tick, returns new checkpoint to persist.
 */
export async function runOneTickWithCheckpoint(options) {
  const { addressConfig: cfg, apiKey, notifyEmail, fromEmail, previousCheckpoint } = options;
  initEmail(apiKey);
  const onTransfer = async (payload) => {
    const result = await sendTransferAlert({
      to: notifyEmail,
      from: fromEmail,
      ...payload,
    });
    if (!result.ok) console.error('[alert] email failed', result.error);
  };
  const cp = previousCheckpoint || {};
  const btc = cfg.bitcoin?.length ? createBitcoinMonitor({ addresses: cfg.bitcoin, onTransfer, initialCheckpoint: cp.bitcoin }) : null;
  const eth = cfg.ethereum?.length ? createEthereumMonitor({ addresses: cfg.ethereum, onTransfer, initialCheckpoint: cp.ethereum }) : null;
  const ada = cfg.cardano?.length ? createCardanoMonitor({ addresses: cfg.cardano, onTransfer, initialCheckpoint: cp.cardano }) : null;
  const ton = cfg.ton?.length ? createTonMonitor({ addresses: cfg.ton, onTransfer, initialCheckpoint: cp.ton }) : null;
  const trx = cfg.tron?.length ? createTronMonitor({ addresses: cfg.tron, onTransfer, initialCheckpoint: cp.tron }) : null;
  const near = cfg.near?.length ? createNearMonitor({ addresses: cfg.near, onTransfer, initialCheckpoint: cp.near }) : null;
  const zec = cfg.zcash?.length ? createZcashMonitor({ addresses: cfg.zcash, onTransfer, initialCheckpoint: cp.zcash }) : null;
  const xrp = cfg.xrp?.length ? createXrpMonitor({ addresses: cfg.xrp, onTransfer, initialCheckpoint: cp.xrp }) : null;
  const out = {};
  if (btc) out.bitcoin = await btc.poll();
  if (eth) out.ethereum = await eth.poll();
  if (ada) out.cardano = await ada.poll();
  if (ton) out.ton = await ton.poll();
  if (trx) out.tron = await trx.poll();
  if (near) out.near = await near.poll();
  if (zec) out.zcash = await zec.poll();
  if (xrp) out.xrp = await xrp.poll();
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
