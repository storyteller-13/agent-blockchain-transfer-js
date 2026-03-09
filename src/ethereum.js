import { ethers } from 'ethers';

const DEFAULT_RPC = 'https://1rpc.io/eth';

/**
 * Create ethers JsonRpcProvider. Prefer WSS for block subscription; HTTP for polling.
 */
export function createProvider(rpcUrl = null) {
  const url = rpcUrl || process.env.ETHEREUM_RPC_URL || DEFAULT_RPC;
  return new ethers.JsonRpcProvider(url);
}

/**
 * Get block with full transaction objects.
 */
export async function getBlockWithTxs(provider, blockNumber) {
  const block = await provider.getBlock(blockNumber, true);
  return block;
}

/**
 * Check if a transaction sends native ETH to one of our addresses.
 * tx.to is the recipient for simple transfers.
 */
export function isIncomingNativeTx(tx, watchedAddresses) {
  if (!tx || !tx.to) return false;
  const toLower = tx.to.toLowerCase();
  return watchedAddresses.some((a) => a.toLowerCase() === toLower);
}

/**
 * Format wei to ETH string.
 */
export function weiToEth(wei) {
  return ethers.formatEther(wei || 0n);
}

export function getEthereumExplorerUrl(txHash) {
  return `https://etherscan.io/tx/${txHash}`;
}
