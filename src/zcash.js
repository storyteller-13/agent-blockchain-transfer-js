const BLOCKCHAIR_API = 'https://api.blockchair.com/zcash';

function apiUrl(path) {
  const key = process.env.BLOCKCHAIR_API_KEY;
  const sep = path.includes('?') ? '&' : '?';
  return key ? `${path}${sep}key=${encodeURIComponent(key)}` : path;
}

/**
 * Fetch recent transactions for a Zcash address (Blockchair dashboard).
 * On 430/429 (rate limit / blacklist) returns [] so the agent keeps running; set BLOCKCHAIR_API_KEY or DISABLE_ZCASH to avoid.
 */
export async function fetchAddressTransactions(address) {
  const path = `${BLOCKCHAIR_API}/dashboards/address/${encodeURIComponent(address)}`;
  const res = await fetch(apiUrl(path));
  if (res.status === 430 || res.status === 429) {
    console.error('[zcash] Blockchair rate limit (430/429). Set BLOCKCHAIR_API_KEY or DISABLE_ZCASH=1.');
    return [];
  }
  if (!res.ok) throw new Error(`Blockchair API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const addrData = data.data?.[address];
  if (!addrData) return [];
  const txs = addrData.transactions || [];
  return Array.isArray(txs) ? txs : [];
}

/**
 * Fetch full transaction details for a tx (to get outputs and recipient amounts).
 * Blockchair: /raw/transaction/TXID. On 430/429 returns null.
 */
export async function fetchTransaction(txId) {
  const path = `${BLOCKCHAIR_API}/raw/transaction/${encodeURIComponent(txId)}`;
  const res = await fetch(apiUrl(path));
  if (res.status === 430 || res.status === 429) return null;
  if (!res.ok) return null;
  const data = await res.json();
  return data.data || data;
}

/**
 * Zcash raw tx: vout[].script_pub_key_address, vout[].value (zatoshi).
 */
export function incomingZatoshiToAddress(tx, address) {
  const vout = tx?.vout || tx?.outputs || [];
  const addrLower = (address || '').toLowerCase();
  let sum = 0;
  for (const out of vout) {
    const outAddr = (out.script_pub_key_address || out.address || '').toLowerCase();
    if (outAddr === addrLower) sum += Number(out.value ?? 0);
  }
  return sum;
}

export function zatoshiToZec(zatoshi) {
  return (Number(zatoshi) / 1e8).toFixed(8);
}

export function getZcashExplorerUrl(txId) {
  return `https://explorer.zcha.in/transactions/${txId}`;
}
