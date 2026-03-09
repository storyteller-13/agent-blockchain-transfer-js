import {
  fetchAddressTransactions,
  fetchTransaction,
  incomingZatoshiToAddress,
  zatoshiToZec,
  getZcashExplorerUrl,
} from '../zcash.js';

export function createZcashMonitor({ addresses, onTransfer, initialCheckpoint }) {
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
        const txIds = await fetchAddressTransactions(address);
        const seen = seenTxids.get(address);
        const isFirstRun = !initialized.has(address);

        for (const txRef of txIds) {
          const txId = typeof txRef === 'string' ? txRef : txRef?.hash ?? txRef?.transaction_id;
          if (!txId || seen.has(txId)) continue;

          const tx = await fetchTransaction(txId);
          const zatoshi = tx ? incomingZatoshiToAddress(tx, address) : 0;
          if (zatoshi <= 0) {
            seen.add(txId);
            continue;
          }

          if (isFirstRun) {
            seen.add(txId);
            continue;
          }

          await onTransfer({
            chain: 'Zcash',
            address,
            txHash: txId,
            amount: zatoshiToZec(zatoshi),
            amountUnit: 'ZEC',
            explorerUrl: getZcashExplorerUrl(txId),
          });
          seen.add(txId);
        }
        initialized.add(address);
      } catch (err) {
        console.error('[zcash]', address, err.message);
      }
    }
    return {
      seen: Object.fromEntries([...seenTxids.entries()].map(([a, s]) => [a, [...s]])),
      initialized: Object.fromEntries([...initialized].map((a) => [a, true])),
    };
  }

  return { poll };
}
