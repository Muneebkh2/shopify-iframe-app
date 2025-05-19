// app/routes/api/metafields.tsx
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    const { productId, iframeUrl } = await request.json();

    if (!productId || !iframeUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: [{ message: "Missing productId or iframeUrl" }],
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const safeValue = JSON.stringify(iframeUrl); // safely escape the value

    const response = await admin.graphql(`
      mutation {
        metafieldsSet(metafields: [
          {
            namespace: "custom",
            key: "iframe_url",
            value: ${safeValue},
            type: "url",
            ownerId: "${productId}"
          }
        ]) {
          metafields {
            id
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `);

    const data = await response.json();
    const errors = data?.data?.metafieldsSet?.userErrors || [];

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        errors,
        data,
      }),
      {
        status: errors.length > 0 ? 400 : 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        errors: [{ message: "Server error", detail: error.message }],
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
