import {
  fetchAddressTxs,
  isIncomingToAddress,
  incomingValueSatoshi,
  satoshiToBtc,
  getBitcoinExplorerUrl,
} from '../bitcoin.js';

/**
 * For each address, we remember the set of txids we've already notified.
 * Optional initialCheckpoint: { seen: { [addr]: string[] }, initialized: { [addr]: true } }
 * poll() returns new checkpoint for persistence (e.g. Vercel cron).
 */
export function createBitcoinMonitor({ addresses, onTransfer, initialCheckpoint }) {
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
        const txs = await fetchAddressTxs(address);
        const seen = seenTxids.get(address);
        const isFirstRun = !initialized.has(address);

        for (const tx of txs) {
          if (seen.has(tx.txid)) continue;
          if (!isIncomingToAddress(tx, address)) continue;

          if (isFirstRun) {
            seen.add(tx.txid);
            continue;
          }

          const valueSat = incomingValueSatoshi(tx, address);
          await onTransfer({
            chain: 'Bitcoin',
            address,
            txHash: tx.txid,
            amount: satoshiToBtc(valueSat),
            amountUnit: 'BTC',
            explorerUrl: getBitcoinExplorerUrl(tx.txid),
          });
          seen.add(tx.txid);
        }
        initialized.add(address);
      } catch (err) {
        console.error('[bitcoin]', address, err.message);
      }
    }
    return {
      seen: Object.fromEntries([...seenTxids.entries()].map(([a, s]) => [a, [...s]])),
      initialized: Object.fromEntries([...initialized].map((a) => [a, true])),
    };
  }

  return { poll };
}
