# External integrations

This project keeps external platform access separate from the customer-facing catalog API. Shopify and WooCommerce are only used by CLI import scripts.

## Shopify

### Required environment variables

- `SHOPIFY_STORE_DOMAIN` — for example `your-store.myshopify.com`
- `SHOPIFY_CLIENT_ID` — Shopify Dev Dashboard client ID
- `SHOPIFY_CLIENT_SECRET` — Shopify Dev Dashboard client secret
- `SHOPIFY_API_VERSION` — default is `2025-01`

### Shopify setup

1. Create or open a Shopify store admin.
2. Create the app in the Shopify Dev Dashboard and configure the Admin API product read scopes.
3. Install the app on the target shop. Client-credentials authentication will fail until installation is complete.
4. Copy the app client ID and client secret into `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`.
5. Set `SHOPIFY_STORE_DOMAIN` to the store hostname without `https://`.

### Commands

```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com \
SHOPIFY_CLIENT_ID=your_client_id \
SHOPIFY_CLIENT_SECRET=your_client_secret \
SHOPIFY_API_VERSION=2025-01 \
npm run db:import:shopify
```

### Dry run

```bash
DRY_RUN=true SHOPIFY_STORE_DOMAIN=your-store.myshopify.com SHOPIFY_CLIENT_ID=your_client_id SHOPIFY_CLIENT_SECRET=your_client_secret npm run db:import:shopify
```

### Shopify demo seeder

The seeder creates 60 deterministic products with SKUs `QS-SHOP-001` through `QS-SHOP-060`. It checks for `write_products` before creating anything, skips existing seeded SKUs, and can be run repeatedly.

```bash
npm run db:seed:shopify
```

## WooCommerce

### Required environment variables

- `WOOCOMMERCE_STORE_URL` — for example `https://example.com`
- `WOOCOMMERCE_CONSUMER_KEY` — WooCommerce REST API consumer key
- `WOOCOMMERCE_CONSUMER_SECRET` — WooCommerce REST API consumer secret

### WooCommerce setup

1. Log in to WordPress admin.
2. Open the WooCommerce settings and generate REST API keys.
3. Give the key `Read` permission and confirm the user can list products.
4. Copy the consumer key and secret into the environment variables.

For WordPress Studio, verify the local site is running and that `/wp-json/wc/v3/products` is reachable. The client tries Basic Auth first and uses the WooCommerce query-parameter fallback when local server configuration does not forward the Authorization header.

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

### WooCommerce demo seeder

The seeder creates or reuses eight categories and creates 60 deterministic products with SKUs `QS-WOO-001` through `QS-WOO-060`. Existing seeded SKUs are skipped, so rerunning it does not create duplicates.

```bash
npm run db:seed:woocommerce
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
- Shopify installation errors: install the Dev Dashboard app on the configured shop and confirm product read scopes.
- WooCommerce authentication errors: regenerate the REST key with `Read` permission and confirm its user can list products.
- Rate limits: wait and retry; the importer does not retry endlessly.
- Empty product payloads: check pagination and API permissions.

## Notes

- No secrets should be committed to the repo.
- No public API route triggers a remote import.
- The import layer is intended for admin/CLI usage only.
