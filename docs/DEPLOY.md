# Deploy to Vercel

## 1. Deploy from your machine

```bash
npm i -g vercel   # if needed
cd /Users/scully/src/PROJECTS/agent-blockchain-transfer-py
vercel login      # once
vercel            # preview, or vercel --prod for production
```

Follow the prompts (link to existing project or create new).

## 2. Or deploy from the Vercel dashboard

1. Push this repo to **GitHub** (if you haven’t).
2. Go to [vercel.com/new](https://vercel.com/new) and **Import** the repo.
3. Leave **Build Command** and **Output Directory** as default (Vercel will detect the project).
4. Before deploying, set **Environment Variables** (or add them after the first deploy in Project → Settings → Environment Variables):

   | Name | Value | Required |
   |------|--------|----------|
   | `RESEND_API_KEY` | Your Resend API key | Yes |
   | `NOTIFY_EMAIL` | Email to receive alerts | Yes |
   | `CONFIG_JSON` | Single-line JSON (see below) | Yes |
   | `FROM_EMAIL` | e.g. `Alerts <onboarding@resend.dev>` | No |
   | `ETHEREUM_RPC_URL` | Optional RPC URL | No |
   | `DISABLE_ZCASH` | `1` to disable Zcash (avoids Blockchair limit) | No |
   | `CRON_SECRET` | Optional; Vercel sets this when triggering cron | No |

5. **CONFIG_JSON** – one line, no line breaks. Example (replace with your addresses):

   ```
   {"bitcoin":["bc1q6yrkch06uwmkkesy5fvfvj00kzm3cqld0w7znu"],"ethereum":["0xe54E5a3ACaa91a2EbFa26cD21372BF9f7E1F1c22"],"cardano":["addr1qxdysr0kh68u63zt5mpk7d5kt8an5n3rxs3t0k2t02sz8e4rhf003andeq6vn9ga4p5dqtkczgnmz0xt3zt2ju7edlws7yfpz0"],"ton":["UQA-EpweW4yj_SJD-8SMAx74oUDMqDOW4YVc_ut4TzXog5nl"],"tron":["TFT1PY2pMaf1czd6MsUuziossBD73sZBRJ"],"near":["fc5de7f6f607f872232e8491a755a5a9656d076ce35d2d5dab800c7250900cb4"],"zcash":["t1em7Vhge9HKi9BYoBi1tADg2eMe5zj3Fvf"],"xrp":["rNyCCdva7q12PBGqe6xYD9fLCZ5yEMjebP"]}
   ```

6. **Vercel KV** (required for cron state):
   - In the project: **Storage** → **Create Database** → **KV**.
   - Connect the KV database to this project so `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set automatically.

7. Click **Deploy**. The cron will call `/api/cron` every 5 minutes (Pro plan; Hobby = once per day).

## 3. Test the cron

Open in the browser (or with curl):

```
https://<your-project>.vercel.app/api/cron
```

You should get `{"ok":true}`. If you set `CRON_SECRET`, use:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://<your-project>.vercel.app/api/cron
```
