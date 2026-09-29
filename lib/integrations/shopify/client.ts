export type ShopifyProductEdge = {
  node: {
    id: string;
    title: string;
    description?: string | null;
    handle: string;
    status?: string | null;
    onlineStoreUrl?: string | null;
    productType?: string | null;
    vendor?: string | null;
    tags?: string[] | null;
    totalInventory?: number | null;
    variants?: {
      nodes?: Array<{
        id: string;
        sku?: string | null;
        price?: string | null;
        inventoryQuantity?: number | null;
        title?: string | null;
        selectedOptions?: Array<{ name: string; value: string }> | null;
      }> | null;
    } | null;
    images?: {
      nodes?: Array<{ url?: string | null; altText?: string | null }> | null;
    } | null;
  };
};

export type ShopifyProductsResponse = {
  products: {
    edges?: ShopifyProductEdge[] | null;
    pageInfo?: {
      hasNextPage?: boolean;
      endCursor?: string | null;
    } | null;
  };
};

export function getShopifyConfig() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim();
  const apiVersion = process.env.SHOPIFY_API_VERSION?.trim() || "2025-01";

  if (!storeDomain || !accessToken) {
    throw new Error(
      "Shopify integration requires SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN."
    );
  }

  return {
    storeDomain,
    accessToken,
    apiVersion,
    endpoint: `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`,
  };
}

export async function shopifyRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const { endpoint, accessToken } = getShopifyConfig();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Shopify request failed (${response.status}): ${message.slice(0, 250)}`);
  }

  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors && payload.errors.length > 0) {
    const details = payload.errors.map((error) => error.message ?? "Unknown GraphQL error").join(", ");
    throw new Error(`Shopify GraphQL error: ${details}`);
  }

  if (!payload.data) {
    throw new Error("Shopify response did not include data.");
  }

  return payload.data;
}

export async function fetchAllShopifyProducts(): Promise<ShopifyProductEdge["node"][]> {
  const pageSize = 50;
  const products: ShopifyProductEdge["node"][] = [];
  let after: string | null = null;

  while (true) {
    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
              id
              title
              description
              handle
              status
              onlineStoreUrl
              productType
              vendor
              tags
              totalInventory
              variants(first: 10) {
                nodes {
                  id
                  sku
                  price
                  inventoryQuantity
                  title
                  selectedOptions {
                    name
                    value
                  }
                }
              }
              images(first: 10) {
                nodes {
                  url
                  altText
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response: ShopifyProductsResponse = await shopifyRequest<ShopifyProductsResponse>(query, {
      first: pageSize,
      after,
    });

    const edges = response.products.edges ?? [];

    for (const edge of edges) {
      products.push(edge.node);
    }

    const pageInfo: NonNullable<ShopifyProductsResponse["products"]["pageInfo"]> = response.products.pageInfo ?? {};
    if (!pageInfo.hasNextPage || !pageInfo.endCursor) {
      break;
    }

    after = pageInfo.endCursor;
  }

  return products;
}
