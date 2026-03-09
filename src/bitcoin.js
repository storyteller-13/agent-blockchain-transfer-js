const BLOCKSTREAM_API = 'https://blockstream.info/api';

/**
 * Fetch recent confirmed transactions for a Bitcoin address.
 * Returns newest first; use lastSeenTxid for pagination.
 */
export async function fetchAddressTxs(address, lastSeenTxid = null) {
  const url = lastSeenTxid
    ? `${BLOCKSTREAM_API}/address/${address}/txs/chain/${lastSeenTxid}`
    : `${BLOCKSTREAM_API}/address/${address}/txs/chain`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Blockstream API ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Check if a transaction sends funds TO the given address (incoming).
 * tx has .vout[].scriptpubkey_address or .vout[].scriptpubkey (for taproot we'd need to resolve).
 */
export function isIncomingToAddress(tx, address) {
  const addrLower = address.toLowerCase();
  for (const out of tx.vout || []) {
    const outAddr = (out.scriptpubkey_address || '').toLowerCase();
    if (outAddr && outAddr === addrLower && (out.value || 0) > 0) return true;
  }
  return false;
}

export function satoshiToBtc(sat) {
  return (Number(sat) / 1e8).toFixed(8);
}

/**
 * Sum incoming value to address in this tx (in satoshis).
 */
export function incomingValueSatoshi(tx, address) {
  const addrLower = address.toLowerCase();
  let sum = 0;
  for (const out of tx.vout || []) {
    const outAddr = (out.scriptpubkey_address || '').toLowerCase();
    if (outAddr === addrLower) sum += Number(out.value || 0);
  }
  return sum;
}

export function getBitcoinExplorerUrl(txid) {
  return `https://blockstream.info/tx/${txid}`;
}
