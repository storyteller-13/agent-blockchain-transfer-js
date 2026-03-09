import {
  createProvider,
  getBlockWithTxs,
  isIncomingNativeTx,
  weiToEth,
  getEthereumExplorerUrl,
} from '../ethereum.js';

/**
 * Polls new blocks and checks each tx for native ETH sent to watched addresses.
 * initialCheckpoint: { lastBlock: number }. poll() returns { lastBlock }.
 */
export function createEthereumMonitor({ addresses, onTransfer, initialCheckpoint }) {
  const provider = createProvider();
  let lastBlockNumber = initialCheckpoint?.lastBlock ?? null;
  const watched = addresses.map((a) => a.toLowerCase());

  async function poll() {
    try {
      const current = await provider.getBlockNumber();
      const start = lastBlockNumber != null ? lastBlockNumber + 1 : current;
      lastBlockNumber = current;

      for (let blockNum = start; blockNum <= current; blockNum++) {
        const block = await getBlockWithTxs(provider, blockNum);
        if (!block?.transactions?.length) continue;

        for (const tx of block.transactions) {
          if (!isIncomingNativeTx(tx, watched)) continue;
          const value = tx.value != null ? tx.value : 0n;
          if (value === 0n) continue;

          await onTransfer({
            chain: 'Ethereum',
            address: tx.to,
            txHash: tx.hash,
            amount: weiToEth(value),
            amountUnit: 'ETH',
            explorerUrl: getEthereumExplorerUrl(tx.hash),
          });
        }
      }
    } catch (err) {
      console.error('[ethereum]', err.message);
    }
    return { lastBlock: lastBlockNumber };
  }

  return { poll };
}
