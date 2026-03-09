import { Resend } from 'resend';

let resend = null;

export function initEmail(apiKey) {
  if (!apiKey) throw new Error('RESEND_API_KEY is required');
  resend = new Resend(apiKey);
}

export async function sendTransferAlert({ to, from, chain, address, txHash, amount, amountUnit, explorerUrl }) {
  if (!resend) throw new Error('Email not initialized. Call initEmail() first.');

  const subject = `[${chain}] Transfer to ${address.slice(0, 10)}…`;
  const html = `
    <h2>Blockchain transfer detected</h2>
    <p><strong>Chain:</strong> ${chain}</p>
    <p><strong>Address:</strong> <code>${address}</code></p>
    <p><strong>Amount:</strong> ${amount} ${amountUnit}</p>
    <p><strong>Transaction:</strong> <a href="${explorerUrl}">${txHash}</a></p>
  `;

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
    idempotencyKey: `transfer-${chain}-${txHash}`.slice(0, 256),
  });

  if (error) {
    console.error('[email]', error);
    return { ok: false, error };
  }
  return { ok: true, id: data?.id };
}
