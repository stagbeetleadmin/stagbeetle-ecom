This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Galla inventory integration

Galla is the in-store POS/inventory system. Stock flows both ways:

| Direction | What happens | Code |
|---|---|---|
| Galla → us (real time) | After every store sale/restock, Galla POSTs the new count to `https://www.stagbeetle.co.in/api/inventory/sync` | `src/app/api/inventory/sync/route.ts` |
| Galla → us (daily safety net) | 03:00 IST Vercel cron pulls Galla's full stock list and corrects any size that drifted | `src/lib/gallaStockPull.ts`, `src/app/api/inventory/galla-pull/route.ts` |
| Us → Galla | After each online order, we tell Galla what sold so the store doesn't sell the same unit | `src/lib/galla.ts` |

Sizes are matched by **Galla barcode** = our variant SKU with hyphens removed (`WINGS-F.S-M` → `WINGSF.SM`), stored per size in `product_variants.galla_sku`.

### Which key is which

There are two different keys, one for each direction. Never put the values in this file — they live in `.env.local` and Vercel → Settings → Environment Variables.

| Env variable | Who creates it | Who sends it | Where it's set in Galla |
|---|---|---|---|
| `INVENTORY_SYNC_API_KEY` (64 hex chars) | **Us** | **Galla**, in the `api-key` header, when calling our `/api/inventory/sync` | Settings → Integration → *Website Integration* → **API Key** (the field next to *Inventory Sync API*) |
| `GALLA_API_KEY` (40 chars) | **Galla** | **Us**, as `Authorization: Bearer …`, when calling Galla's order webhook and stock-list | Settings → Integration → top **API Key** box. ⚠️ Clicking **Generate** there replaces it — update `GALLA_API_KEY` in `.env.local` and Vercel immediately if you do, or orders and the stock pull stop reaching Galla |

The two must not be swapped: Galla's *Website Integration → API Key* must equal **our** `INVENTORY_SYNC_API_KEY`, and the value in Vercel must be identical to it (a mismatch rejects every Galla push with `invalid_credentials`).

### All Galla-related env variables

| Variable | Purpose |
|---|---|
| `INVENTORY_SYNC_API_KEY` | Key Galla must send to push stock to us (see above) |
| `INVENTORY_SYNC_SECRET` | Alternative HMAC signing secret for `/api/inventory/sync` (`X-Stagbeetle-Signature`); Galla doesn't use it today |
| `INVENTORY_SYNC_ALLOWED_IPS` | Optional comma-separated IP allowlist for inbound calls (Galla calls from `52.172.249.3`); empty = any IP |
| `GALLA_API_KEY` | Galla-issued token for our calls to Galla |
| `GALLA_STORE_CODE` / `GALLA_LOC_CODE` | Our Galla store (`0b39d036`) and location (`RRBPS`, Singanayakanahalli) — sent as `store-code` / `loc-code` headers (hyphens, not underscores) |
| `GALLA_ORDERS_SYNC_URL` | Galla's order webhook, `https://retail.galla.app/mystorev2/api/v2/webhooks/orders` |
| `GALLA_STOCK_LIST_URL` | Optional override; defaults to `https://retail.galla.app/mystorev2/api/v2/inventory/stock-list` |
| `GALLA_SKU_ALLOWLIST` | Testing only: if set, only these items are reported to Galla after online orders. Remove for go-live, or online sales of other items never reduce Galla's stock |
| `CRON_SECRET` | Vercel sends it to authorise the daily `/api/inventory/galla-pull` run |

### Admin: Galla Stock Sync page

`/admin/inventory-sync` (sidebar → **GALLA STOCK SYNC**) has a **Sync from Galla now** button (the same pull as the daily cron), live status cards (last Galla push, rejected Galla calls in 24h, last full sync) and three tabs:

- **Health & Sync** — every size next to Galla's live count, worst problems first, with per-size **Set stock** / **Set barcode** fixes and a CSV export.
- **Validation checklist** — every product and size against nine rules (size record exists, size still offered, barcode set / follows the rule / unique / found in Galla, stock tracked, count = Galla, no sync errors in 7 days) as ✓/✗ columns, with the reason and a fix on each failing size. Rules live in `src/lib/gallaChecks.ts`.
- **Sync logs** — every Galla push, rejected call (with whether the API key was wrong or missing), full sync, CSV import and online order sent to Galla, in plain English with the raw data one click away. Filter by type, problems only, time range, or a SKU / barcode; each size's **Logs** button opens its history (`?tab=logs&codes=SKU,BARCODE`).

### Commands

```bash
npm run galla:pull              # preview what Galla's stock list would change
npm run galla:pull -- --apply   # apply it now
npm run galla:logs              # write logs/galla-sync.log (last 7 days; --days 30 for more)
```

`galla:logs` shows every push from Galla, every rejected attempt with the reason and a fingerprint of the key Galla sent (compare with ours, printed at the top of the file), each stock pull, and each order sent to Galla. The live record is the `inventory_sync_log` table.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
