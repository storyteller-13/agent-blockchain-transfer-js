import {
  fetchAccountTransactions,
  getIncomingDrops,
  dropsToXrp,
  getXrpExplorerUrl,
} from '../xrp.js';

export function createXrpMonitor({ addresses, onTransfer, initialCheckpoint }) {
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
    for (const account of addresses) {
      try {
        const rawTxs = await fetchAccountTransactions(account);
        const seen = seenHashes.get(account);
        const isFirstRun = !initialized.has(account);

        for (const item of rawTxs) {
          const tx = item.tx || item;
          const meta = item.meta || item.metaData;
          const txHash = item.hash || tx.hash || tx.transactionHash;
          if (!txHash || seen.has(txHash)) continue;

          const drops = getIncomingDrops({ tx, meta }, account);
          if (drops <= 0) {
            seen.add(txHash);
            continue;
          }

          if (isFirstRun) {
            seen.add(txHash);
            continue;
          }

          await onTransfer({
            chain: 'XRP',
            address: account,
            txHash,
            amount: dropsToXrp(drops),
            amountUnit: 'XRP',
            explorerUrl: getXrpExplorerUrl(txHash),
          });
          seen.add(txHash);
        }
        initialized.add(account);
      } catch (err) {
        console.error('[xrp]', account, err.message);
      }
    }
    return {
      seen: Object.fromEntries([...seenHashes.entries()].map(([a, s]) => [a, [...s]])),
      initialized: Object.fromEntries([...initialized].map((a) => [a, true])),
    };
  }

  return { poll };
}
