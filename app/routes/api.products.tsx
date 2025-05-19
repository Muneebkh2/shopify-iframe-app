// app/routes/api/products.tsx
import { authenticate } from "../shopify.server";

export async function loader({ request }: { request: Request }) {
  const { admin } = await authenticate.admin(request);

  let allProducts: any[] = [];
  let hasNextPage = true;
  let endCursor: string | null = null;

  while (hasNextPage) {
    const query = `
      query GetProducts($cursor: String) {
        products(first: 100, after: $cursor) {
          edges {
            cursor
            node {
              id
              title
              metafields(first: 10) {
                edges {
                  node {
                    namespace
                    key
                    value
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                  }
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

    const response = await admin.graphql(query, {
      variables: { cursor: endCursor },
    });

    const data = await response.json();
    const products = data?.data?.products?.edges || [];

    allProducts.push(
      ...products.map((edge: any) => {
        const product = edge.node;

        // Extract only the iframe_url metafield
        const iframeMeta = product.metafields?.edges?.find(
          (m) =>
            m.node.namespace === "custom" && m.node.key === "iframe_url"
        );

        return {
          ...product,
          metafields: {
            edges: iframeMeta ? [iframeMeta] : [],
          },
        };
      })
    );

    hasNextPage = data.data.products.pageInfo.hasNextPage;
    endCursor = data.data.products.pageInfo.endCursor;
  }

  return new Response(JSON.stringify({ products: allProducts }), {
    headers: { "Content-Type": "application/json" },
  });
}
