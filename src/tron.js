const TRONGRID_API = 'https://api.trongrid.io';

/**
 * Fetch recent transactions for a Tron address (native TRX only; only_confirmed, only_to).
 */
export async function fetchAccountTransactions(address, limit = 30) {
  const url = `${TRONGRID_API}/v1/accounts/${encodeURIComponent(address)}/transactions?only_confirmed=true&only_to=true&limit=${limit}&order_by=block_timestamp,desc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TronGrid API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const list = data.data || data;
  return Array.isArray(list) ? list : [];
}

/**
 * Filter for native TRX transfers (type TransferContract). Returns amount in sun.
 */
export function isNativeTransfer(tx) {
  const type = tx.raw_data?.contract?.[0]?.type;
  return type === 'TransferContract';
}

export function getTransferAmountSun(tx, toAddress) {
  const contract = tx.raw_data?.contract?.[0];
  if (!contract || contract.type !== 'TransferContract') return 0;
  const to = (contract.parameter?.value?.to_address || '').toLowerCase();
  const addr = (toAddress || '').toLowerCase();
  if (to !== addr) return 0;
  return Number(contract.parameter?.value?.amount || 0);
}

export function sunToTrx(sun) {
  return (Number(sun) / 1e6).toFixed(6);
}

export function getTronExplorerUrl(txId) {
  return `https://tronscan.org/#/transaction/${txId}`;
}
