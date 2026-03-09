const XRPL_API = 'https://api.xrpl.org';

/**
 * Fetch recent transactions for an XRP account (account_tx method).
 */
export async function fetchAccountTransactions(account, limit = 50) {
  const res = await fetch(XRPL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'account_tx',
      params: [
        {
          account,
          limit,
          ledger_index_min: -1,
          ledger_index_max: -1,
        },
      ],
      id: 1,
      jsonrpc: '2.0',
    }),
  });
  if (!res.ok) throw new Error(`XRPL API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const result = data.result;
  if (!result || result.error) return [];
  const txs = result.transactions || [];
  return Array.isArray(txs) ? txs : [];
}

/**
 * Check if validated tx is a Payment to our account with XRP (drops).
 */
export function getIncomingDrops(tx, ourAccount) {
  const meta = tx.meta;
  const txData = tx.tx || tx;
  if (txData.TransactionType !== 'Payment') return 0;
  const dest = (txData.Destination || '').toLowerCase();
  if (dest !== (ourAccount || '').toLowerCase()) return 0;
  const amt = txData.Amount;
  if (typeof amt === 'string') return Number(amt); // drops
  if (typeof amt === 'object' && amt.currency === 'XRP') return Number(amt.value || 0) * 1e6;
  return 0;
}

export function dropsToXrp(drops) {
  return (Number(drops) / 1e6).toFixed(6);
}

export function getXrpExplorerUrl(txHash) {
  return `https://livenet.xrpl.org/transactions/${txHash}`;
}
