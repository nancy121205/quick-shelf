# Quick Shelf — High-Speed Product Catalog Platform
Quick Shelf is a mobile-first product catalog platform that imports products from Shopify and WooCommerce into a central database, served through a fast internal API. Supports multiple frontend designs, admin-managed sync, wishlist, and WhatsApp-based customer enquiries — no cart, no login required.

## Features

- Shopify product import and synchronization
- WooCommerce REST API integration
- Centralized PostgreSQL product database
- Internal product and category APIs
- Search, category and availability filtering
- Product details and related products
- Wishlist using localStorage
- Single and multi-product WhatsApp enquiry
- Admin dashboard for catalog management
- Product, category and settings management
- Sync logs and import status
- Multiple catalog designs
- Responsive mobile-first UI
- Image fallback and lazy loading
- Protected admin authentication

## Architecture

```text
Shopify / WooCommerce
        ↓
Import & Sync Engine
        ↓
Central PostgreSQL Database
        ↓
Internal Catalog API
        ↓
Quick Shelf Customer Catalog
```

The customer catalog primarily uses the internal database instead of calling external e-commerce APIs for every request.

## Tech Stack

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- Prisma 7
- PostgreSQL / Supabase
- Shopify Admin API
- WooCommerce REST API
- Git / GitHub
- Vercel

## Routes

### Customer

```text
/                  → Landing page
/catalog           → Product catalog
/products/[id]     → Product details
/wishlist          → Wishlist
```

### Admin

```text
/admin/login
/admin
/admin/products
/admin/categories
/admin/settings
/admin/sync
```

### Internal APIs

```text
GET /api/products
GET /api/products/[id]
GET /api/products/[id]/related
GET /api/categories
GET /api/config
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file:

```env
DATABASE_URL=

SHOPIFY_STORE_DOMAIN=
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_API_VERSION=

WOOCOMMERCE_STORE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=

ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

Never commit `.env` or expose secret values publicly.

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Apply migrations

```bash
npx prisma migrate deploy
```

### 5. Start the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Demo Data

The Shopify development store contains **60 demo products** with deterministic SKUs:

```text
QS-SHOP-001
QS-SHOP-002
...
QS-SHOP-060
```

These products can be imported into the central Quick Shelf database through the Shopify integration.

## Admin Authentication

Admin authentication is configured using:

```env
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

The admin area uses server-side authentication with a signed session cookie.

## WhatsApp Enquiry

Customers can generate WhatsApp enquiries for:

- Individual products
- Multiple selected products

The WhatsApp number is configurable from the admin settings.

## External Integrations

### Shopify

Uses the Shopify Admin API for:

- Product retrieval
- Pagination
- Product mapping
- Import
- Synchronization
- Duplicate prevention

### WooCommerce

Uses the WooCommerce REST API for:

- Product retrieval
- Pagination
- Product mapping
- Import
- Synchronization

## Performance & Reliability

- Customer pages use the internal database/API
- External APIs are not required for every customer page request
- Pagination reduces payload size
- Images are lazy-loaded where appropriate
- Missing images use a fallback
- Loading and error states are included
- Previously imported products remain available if an external source is unavailable

## Validation

Run:

```bash
npm run lint
npm run build
```

Prisma validation:

```bash
npx prisma validate
```

## Deployment

The application is deployed using **Vercel** with **Supabase PostgreSQL**.

For Vercel/serverless deployment, use the Supabase Transaction Pooler connection where appropriate:

```text
:6543
```

Configure all required environment variables in:

```text
Vercel → Project → Settings → Environment Variables
```

## Demo

Customer:

```text
https://<your-vercel-domain>/
```

Admin:

```text
https://<your-vercel-domain>/admin/login
```

Use the dedicated demo admin credentials configured in Vercel.

## Project Structure

```text
app/
├── admin/
├── api/
├── catalog/
├── products/
├── wishlist/
└── page.tsx

lib/
├── prisma.ts
├── admin-auth.ts
├── import-service.ts
├── mapper.ts
└── category-normalizer.ts

prisma/
└── schema.prisma

scripts/
├── seed-shopify.ts
├── seed-woocommerce.ts
├── import-shopify.ts
└── import-woocommerce.ts
```

## Project Goal

Quick Shelf demonstrates a reusable catalog architecture that separates:

**External Sources → Import & Sync → Central Database → Internal API → Customer Catalog**

This allows the same product data and backend APIs to support multiple catalog designs and a fast customer experience.
