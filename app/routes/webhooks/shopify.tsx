import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";

export const action: ActionFunction = async ({ request }) => {
  const topic = request.headers.get("x-shopify-topic");

  if (topic === "APP_INSTALLED") {
    const shop = request.headers.get("x-shopify-shop-domain");

    const mutation = `
      mutation {
        metafieldDefinitionCreate(definition: {
          name: "Iframe URL",
          namespace: "custom",
          key: "iframe_url",
          type: "single_line_text_field",
          ownerType: PRODUCT_VARIANT,
          visibleToStorefront: true
        }) {
          createdDefinition {
            id
            name
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_API_KEY!,
      },
      body: JSON.stringify({ query: mutation }),
    });
  }

  return json({ success: true });
};
