const NEARBLOCKS_API = 'https://api.nearblocks.io/v1';

/**
 * Fetch recent transactions for a NEAR account (NearBlocks API).
 */
export async function fetchAccountTxns(accountId, limit = 25) {
  const url = `${NEARBLOCKS_API}/account/${encodeURIComponent(accountId)}/txns?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NearBlocks API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const list = data.txns || data;
  return Array.isArray(list) ? list : [];
}

/**
 * Check if tx is an incoming native NEAR transfer (receiver is us, action is Transfer).
 */
export function getIncomingNear(tx, ourAccountId) {
  const receiver = (tx.receiver_id || '').toLowerCase();
  const us = (ourAccountId || '').toLowerCase();
  if (receiver !== us) return 0;
  const actions = tx.actions || tx.action || [];
  const list = Array.isArray(actions) ? actions : [actions];
  let sum = 0;
  for (const a of list) {
    if (a?.Transfer?.deposit) {
      sum += Number(a.Transfer.deposit);
    }
  }
  return sum;
}

export function yoctoNearToNear(yocto) {
  return (Number(yocto) / 1e24).toFixed(6);
}

export function getNearExplorerUrl(txHash) {
  return `https://nearblocks.io/txns/${txHash}`;
}
