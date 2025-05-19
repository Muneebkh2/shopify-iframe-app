// app/routes/api/metafield-init.tsx
import { authenticate } from "../shopify.server";

export async function action({ request }: { request: Request }) {
  const { admin } = await authenticate.admin(request);

  // Step 1: Create metafield definition (remove `visibleToStorefront`)
  const createResponse = await admin.graphql(`
    mutation {
      metafieldDefinitionCreate(definition: {
        name: "Iframe URL",
        namespace: "custom",
        key: "iframe_url",
        type: "url",
        ownerType: PRODUCT
      }) {
        createdDefinition {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `);

  const createData = await createResponse.json();
  const definitionId = createData?.data?.metafieldDefinitionCreate?.createdDefinition?.id;
  const userErrors = createData?.data?.metafieldDefinitionCreate?.userErrors;

  if (userErrors?.length > 0) {
    return new Response(JSON.stringify({ success: false, errors: userErrors }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  // Step 2: Pin the metafield
  const pinResponse = await admin.graphql(`
    mutation {
      metafieldDefinitionPin(definitionId: "${definitionId}") {
        pinnedDefinition {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `);

  const pinData = await pinResponse.json();
  const pinErrors = pinData?.data?.metafieldDefinitionPin?.userErrors;

  if (pinErrors?.length > 0) {
    return new Response(JSON.stringify({ success: false, errors: pinErrors }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  return new Response(JSON.stringify({ success: true, definitionId }), {
    headers: { "Content-Type": "application/json" },
  });
}


// // app/routes/api/metafield-init.tsx
// import { authenticate } from "../shopify.server";

// export async function action({ request }: { request: Request }) {
//   const { admin } = await authenticate.admin(request);

//   const response = await admin.graphql(`
//     mutation {
//       metafieldDefinitionCreate(definition: {
//         name: "Iframe URL",
//         namespace: "custom",
//         key: "iframe_url",
//         type: "single_line_text_field",
//         ownerType: PRODUCT
//       }) {
//         createdDefinition {
//           id
//         }
//         userErrors {
//           field
//           message
//         }
//       }
//     }
//   `);

//   const data = await response.json();
//   return new Response(JSON.stringify({ created: true, response: data }), {
//     headers: { "Content-Type": "application/json" },
//   });
// }
