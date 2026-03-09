const TONCENTER_API = 'https://toncenter.com/api/v2';

/**
 * Fetch recent transactions for a TON address.
 */
export async function fetchAddressTransactions(address, limit = 20) {
  const url = `${TONCENTER_API}/getTransactions?address=${encodeURIComponent(address)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TON API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.ok || !Array.isArray(data.result)) return [];
  return data.result;
}

/**
 * Check if transaction is an incoming transfer to our address (in_msg is a simple transfer to address).
 * Returns amount in nanoton or 0.
 */
export function getIncomingAmount(tx, ourAddress) {
  const msg = tx.in_msg;
  if (!msg || msg.source === '') return 0; // no incoming message or bounce
  const dest = (msg.destination || '').toLowerCase();
  const toUs = dest && ourAddress.toLowerCase() === dest;
  if (!toUs) return 0;
  const value = Number(msg.value || 0);
  return value > 0 ? value : 0;
}

export function nanotonToTon(nanoton) {
  return (Number(nanoton) / 1e9).toFixed(9);
}

export function getTonExplorerUrl(txOrHash) {
  const hash =
    typeof txOrHash === 'string'
      ? txOrHash
      : txOrHash?.transaction_id?.hash || txOrHash?.hash || '';
  return `https://tonscan.org/tx/${hash}`;
}
