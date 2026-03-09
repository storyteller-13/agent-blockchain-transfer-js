import {
  fetchAddressTransactions,
  getIncomingAmount,
  nanotonToTon,
  getTonExplorerUrl,
} from '../ton.js';

export function createTonMonitor({ addresses, onTransfer, initialCheckpoint }) {
  const seenLt = new Map();
  const initialized = new Set();
  if (initialCheckpoint?.seen) {
    for (const [addr, list] of Object.entries(initialCheckpoint.seen)) {
      seenLt.set(addr, new Set(Array.isArray(list) ? list : []));
    }
  }
  if (initialCheckpoint?.initialized) {
    for (const addr of Object.keys(initialCheckpoint.initialized)) {
      initialized.add(addr);
    }
  }
  for (const addr of addresses) {
    if (!seenLt.has(addr)) seenLt.set(addr, new Set());
  }

  function txKey(tx) {
    const lt = tx.transaction_id?.lt ?? tx.lt;
    const hash = tx.transaction_id?.hash ?? tx.hash ?? '';
    return `${lt}:${hash}`;
  }

  async function poll() {
    for (const address of addresses) {
      try {
        const txs = await fetchAddressTransactions(address, 30);
        const seen = seenLt.get(address);
        const isFirstRun = !initialized.has(address);

        for (const tx of txs) {
          const key = txKey(tx);
          if (seen.has(key)) continue;

          const amount = getIncomingAmount(tx, address);
          if (amount <= 0) {
            seen.add(key);
            continue;
          }

          if (isFirstRun) {
            seen.add(key);
            continue;
          }

          const hash = tx.transaction_id?.hash ?? tx.hash ?? key;
          await onTransfer({
            chain: 'TON',
            address,
            txHash: hash,
            amount: nanotonToTon(amount),
            amountUnit: 'TON',
            explorerUrl: getTonExplorerUrl(tx),
          });
          seen.add(key);
        }
        initialized.add(address);
      } catch (err) {
        console.error('[ton]', address, err.message);
      }
    }
    return {
      seen: Object.fromEntries([...seenLt.entries()].map(([a, s]) => [a, [...s]])),
      initialized: Object.fromEntries([...initialized].map((a) => [a, true])),
    };
  }

  return { poll };
}
