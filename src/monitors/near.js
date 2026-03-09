import {
  fetchAccountTxns,
  getIncomingNear,
  yoctoNearToNear,
  getNearExplorerUrl,
} from '../near.js';

export function createNearMonitor({ addresses, onTransfer, initialCheckpoint }) {
  const seenHashes = new Map();
  const initialized = new Set();
  if (initialCheckpoint?.seen) {
    for (const [addr, list] of Object.entries(initialCheckpoint.seen)) {
      seenHashes.set(addr, new Set(Array.isArray(list) ? list : []));
    }
  }
  if (initialCheckpoint?.initialized) {
    for (const addr of Object.keys(initialCheckpoint.initialized)) {
      initialized.add(addr);
    }
  }
  for (const addr of addresses) {
    if (!seenHashes.has(addr)) seenHashes.set(addr, new Set());
  }

  async function poll() {
    for (const accountId of addresses) {
      try {
        const txns = await fetchAccountTxns(accountId);
        const seen = seenHashes.get(accountId);
        const isFirstRun = !initialized.has(accountId);

        for (const tx of txns) {
          const hash = tx.hash || tx.transaction_hash || tx.tx_hash;
          if (!hash || seen.has(hash)) continue;

          const yocto = getIncomingNear(tx, accountId);
          if (yocto <= 0) {
            seen.add(hash);
            continue;
          }

          if (isFirstRun) {
            seen.add(hash);
            continue;
          }

          await onTransfer({
            chain: 'NEAR',
            address: accountId,
            txHash: hash,
            amount: yoctoNearToNear(yocto),
            amountUnit: 'NEAR',
            explorerUrl: getNearExplorerUrl(hash),
          });
          seen.add(hash);
        }
        initialized.add(accountId);
      } catch (err) {
        console.error('[near]', accountId, err.message);
      }
    }
    return {
      seen: Object.fromEntries([...seenHashes.entries()].map(([a, s]) => [a, [...s]])),
      initialized: Object.fromEntries([...initialized].map((a) => [a, true])),
    };
  }

  return { poll };
}
