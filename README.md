# 🧔🏼‍♂️ Bill, the Blockchain Transfer Alert Agent

<br>

- Sends you an email (via [Resend](https://resend.com)) whenever a transfer is detected to a watched **Bitcoin** (or other chain) address.

<br>

## Setup

1. Install dependencies:

   ```bash
   make install
   ```

2. **Environment variables**

   - Copy `.env.example` to `.env`.
   - [Create a Resend API key](https://resend.com/api-keys) and set `RESEND_API_KEY`.
   - Set `NOTIFY_EMAIL` to the address that should receive alerts.
   - (Optional) Set `FROM_EMAIL`; for production use a [verified domain](https://resend.com/domains). For testing you can keep `Alerts <onboarding@resend.dev>`.
   - (Optional) `ETHEREUM_RPC_URL` – recommended for production (e.g. [Alchemy](https://alchemy.com) or [Infura](https://infura.io)); avoids rate limits and downtime from public RPCs.
   - (Optional) `POLL_INTERVAL_SEC` – default `30`.

3. **Addresses config**

   - Copy `config.example.json` to `config.json`.
   - Add addresses to watch in all the chains.

4. **Run the agent**

   ```bash
   make server
   ```