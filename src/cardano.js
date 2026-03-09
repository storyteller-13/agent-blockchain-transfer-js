const KOIOS_API = 'https://api.koios.rest/api/v1';

/**
 * Fetch recent transactions for a Cardano address (Koios API).
 * Returns tx_hash, block_height, etc. We then get UTXOs per tx to detect incoming ADA.
 */
export async function fetchAddressTxs(address) {
  const res = await fetch(`${KOIOS_API}/address_txs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _addresses: [address] }),
  });
  if (!res.ok) throw new Error(`Koios API ${res.status}: ${await res.text()}`);
  const list = await res.json();
  return Array.isArray(list) ? list : [];
}

/**
 * Get UTXOs created by a transaction (outputs). Used to sum incoming lovelace to our address.
 */
export async function fetchTxUtxos(txHash) {
  const res = await fetch(`${KOIOS_API}/tx_utxos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _tx_hashes: [txHash] }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const one = Array.isArray(data) ? data[0] : data;
  return one || null;
}

/**
 * For a tx's UTXO set, sum lovelace sent to the given address (payments to us).
 * Handles Koios output shape: outputs[].payment_addr?.bech32 or .receiver, .value (lovelace).
 */
export function incomingLovelaceToAddress(txUtxos, address) {
  const outputs = txUtxos?.outputs;
  if (!Array.isArray(outputs)) return 0;
  const addrLower = address.toLowerCase();
  let sum = 0;
  for (const out of outputs) {
    const addr = (out.payment_addr?.bech32 || out.receiver || '').toLowerCase();
    if (addr === addrLower) {
      const lovelace = Number(out.value ?? 0);
      if (lovelace > 0) sum += lovelace;
    }
  }
  return sum;
}

export function lovelaceToAda(lovelace) {
  return (Number(lovelace) / 1e6).toFixed(6);
}

export function getCardanoExplorerUrl(txHash) {
  return `https://cardanoscan.io/transaction/${txHash}`;
}
