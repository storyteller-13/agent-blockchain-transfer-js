/**
 * Serves the root page so Vercel doesn't show 404.
 */

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bill, the Blockchain Transfer Alert Agent</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #1a1a1a; }
    a { color:rgb(192, 33, 186); }
    code { background: #f0f0f0; padding: 0.2em 0.4em; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>bill, the blockchain transfer alert agent</h1>
  <p>sends email (via resend) when a transfer is detected to a watched address on bitcoin, ethereum, cardano, ton, tron, near, zcash, or xrp.</p>
  <p>the poll runs on a schedule via <code><a href="/api/cron">/api/cron</a></code>. trigger manually by opening that link (or with <code>authorization: bearer cron_secret</code> if set).</p>
  <p><a href="https://github.com/storyteller-13/agent-blockchain-transfer-py">source</a></p>
</body>
</html>
`;

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).end(html.trim());
}
