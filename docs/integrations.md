# External integrations

This project keeps external platform access separate from the customer-facing catalog API. Shopify and WooCommerce are only used by CLI import scripts.

## Shopify

### Required environment variables

- `SHOPIFY_STORE_DOMAIN` — for example `your-store.myshopify.com`
- `SHOPIFY_ACCESS_TOKEN` — Shopify Admin API access token
- `SHOPIFY_API_VERSION` — default is `2025-01`

### Shopify setup

1. Create or open a Shopify store admin.
2. Create a custom app or use a private app with Admin API access.
3. Grant the app the required permissions to read products and product metadata.
4. Copy the admin access token into `SHOPIFY_ACCESS_TOKEN`.
5. Set `SHOPIFY_STORE_DOMAIN` to the store hostname without `https://`.

### Commands

```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com \
SHOPIFY_ACCESS_TOKEN=your_token \
SHOPIFY_API_VERSION=2025-01 \
npm run db:import:shopify
```

### Dry run

```bash
DRY_RUN=true SHOPIFY_STORE_DOMAIN=your-store.myshopify.com SHOPIFY_ACCESS_TOKEN=your_token npm run db:import:shopify
```

## WooCommerce

### Required environment variables

- `WOOCOMMERCE_STORE_URL` — for example `https://example.com`
- `WOOCOMMERCE_CONSUMER_KEY` — WooCommerce REST API consumer key
- `WOOCOMMERCE_CONSUMER_SECRET` — WooCommerce REST API consumer secret

### WooCommerce setup

1. Log in to WordPress admin.
2. Open the WooCommerce settings and generate REST API keys.
3. Give the key read access to products and product metadata.
4. Copy the consumer key and secret into the environment variables.

### Commands

```bash
WOOCOMMERCE_STORE_URL=https://example.com \
WOOCOMMERCE_CONSUMER_KEY=key \
WOOCOMMERCE_CONSUMER_SECRET=secret \
npm run db:import:woocommerce
```

### Dry run

```bash
DRY_RUN=true WOOCOMMERCE_STORE_URL=https://example.com WOOCOMMERCE_CONSUMER_KEY=key WOOCOMMERCE_CONSUMER_SECRET=secret npm run db:import:woocommerce
```

## Synchronization behavior

- Each import creates a `SyncLog` entry.
- Products are matched by `sourceType + sourceId`.
- Existing products are updated in place.
- New products are created.
- Failed products are recorded without stopping the rest of the import.
- The customer catalog continues to read exclusively from the local PostgreSQL database.

## Troubleshooting

- Missing credentials: check the environment variables and `.env` file.
- Authentication errors: confirm the token or WooCommerce key pair is correct.
- Rate limits: wait and retry; the importer does not retry endlessly.
- Empty product payloads: check pagination and API permissions.

## Notes

- No secrets should be committed to the repo.
- No public API route triggers a remote import.
- The import layer is intended for admin/CLI usage only.
