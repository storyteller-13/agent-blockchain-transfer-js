import {
  fetchAddressTxs,
  fetchTxUtxos,
  incomingLovelaceToAddress,
  lovelaceToAda,
  getCardanoExplorerUrl,
} from '../cardano.js';

export function createCardanoMonitor({ addresses, onTransfer, initialCheckpoint }) {
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
          const txHash = tx.tx_hash || tx.hash;
          if (!txHash || seen.has(txHash)) continue;

          const utxos = await fetchTxUtxos(txHash);
          const lovelace = incomingLovelaceToAddress(utxos, address);
          if (lovelace <= 0) {
            seen.add(txHash);
            continue;
          }

          if (isFirstRun) {
            seen.add(txHash);
            continue;
          }

          await onTransfer({
            chain: 'Cardano',
            address,
            txHash,
            amount: lovelaceToAda(lovelace),
            amountUnit: 'ADA',
            explorerUrl: getCardanoExplorerUrl(txHash),
          });
          seen.add(txHash);
        }
        initialized.add(address);
      } catch (err) {
        console.error('[cardano]', address, err.message);
      }
    }
    return {
      seen: Object.fromEntries([...seenTxids.entries()].map(([a, s]) => [a, [...s]])),
      initialized: Object.fromEntries([...initialized].map((a) => [a, true])),
    };
  }

  return { poll };
}
