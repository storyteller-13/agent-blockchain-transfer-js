import {
  fetchAccountTransactions,
  getTransferAmountSun,
  sunToTrx,
  getTronExplorerUrl,
} from '../tron.js';

export function createTronMonitor({ addresses, onTransfer, initialCheckpoint }) {
  const seenTxids = new Map();
  const initialized = new Set();
  if (initialCheckpoint?.seen) {
    for (const [addr, list] of Object.entries(initialCheckpoint.seen)) {
      seenTxids.set(addr, new Set(Array.isArray(list) ? list : []));
    }
  }
  if (initialCheckpoint?.initialized) {
    for (const addr of Object.keys(initialCheckpoint.initialized)) {
      initialized.add(addr);
    }
  }
  for (const addr of addresses) {
    if (!seenTxids.has(addr)) seenTxids.set(addr, new Set());
  }

  async function poll() {
    for (const address of addresses) {
      try {
        const txs = await fetchAccountTransactions(address);
        const seen = seenTxids.get(address);
        const isFirstRun = !initialized.has(address);

        for (const tx of txs) {
          const txId = tx.txID || tx.txId || tx.transaction_id;
          if (!txId || seen.has(txId)) continue;

          const sun = getTransferAmountSun(tx, address);
          if (sun <= 0) {
            seen.add(txId);
            continue;
          }

          if (isFirstRun) {
            seen.add(txId);
            continue;
          }

          await onTransfer({
            chain: 'Tron',
            address,
            txHash: txId,
            amount: sunToTrx(sun),
            amountUnit: 'TRX',
            explorerUrl: getTronExplorerUrl(txId),
          });
          seen.add(txId);
        }
        initialized.add(address);
      } catch (err) {
        console.error('[tron]', address, err.message);
      }
    }
    return {
      seen: Object.fromEntries([...seenTxids.entries()].map(([a, s]) => [a, [...s]])),
      initialized: Object.fromEntries([...initialized].map((a) => [a, true])),
    };
  }

  return { poll };
}
