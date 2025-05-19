// app/routes/index.tsx
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import ProductTable from "../components/ProductTable";
import type { DataFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: DataFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    {
      metafieldDefinitions(ownerType: PRODUCT, first: 1, namespace: "custom", key: "iframe_url") {
        edges {
          node {
            id
          }
        }
      }
    }
  `);

  const data = await response.json();
  const exists = data?.data?.metafieldDefinitions?.edges?.length > 0;
  const url = new URL(request.url);
  const justInitialized = url.searchParams.get("initialized") === "true";

  return json({ metafieldExists: exists, justInitialized });
};

export default function Index() {
  const { metafieldExists, justInitialized } = useLoaderData<{
    metafieldExists: boolean;
    justInitialized: boolean;
  }>();
  const fetcher = useFetcher();

  const initializeApp = () => {
    fetcher.submit(null, {
      method: "POST",
      action: "/api/metafield-init",
    });
    // fetcher.submit(null, {
    //   method: "POST",
    //   action: "/api/theme-inject",
    // });
    // fetch("/api/theme-inject", { method: "POST" }).then(() => {
    //   alert("Theme updated with iframe support");
    // });
  };
  const initializeThemeUpdate = () => {
    fetcher.submit(null, {
      method: "POST",
      action: "/api/theme-inject",
    });
  };

  const initError =
  fetcher.data && fetcher.data.success === false
    ? fetcher.data?.error ||
      fetcher.data?.errors?.[0]?.message ||
      "Unknown error"
    : null;


  return (
    <Page title="Iframe URL Manager">
      <Layout>
        <Layout.Section>
          {justInitialized && (
            <Banner title="App initialized successfully" status="success" />
          )}

          {initError && (
            <Banner title="Initialization failed" status="critical">
              <p>{initError}</p>
            </Banner>
          )}

          {metafieldExists ? (
            <><Card sectioned>
              <Button
                onClick={initializeThemeUpdate}
                loading={fetcher.state === "submitting"}
              >
                Inject Code
              </Button>
            </Card><ProductTable /></>
          ) : (
            <Card sectioned>
              <Text variant="headingMd">Initialize the App</Text>
              <Text>
                Click the button below to create and pin the iframe_url
                metafield for product variants.
              </Text>
              <Button
                onClick={initializeApp}
                loading={fetcher.state === "submitting"}
              >
                Initialize App
              </Button>
            </Card>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}



// import { json } from "@remix-run/node";
// import { useFetcher, useLoaderData } from "@remix-run/react";
// import {
//   Page,
//   Layout,
//   Card,
//   Text,
//   Button,
//   Spinner,
// } from "@shopify/polaris";
// import { authenticate } from "../shopify.server";
// import ProductTable from "../components/ProductTable";

// import type { DataFunctionArgs } from "@remix-run/node";

// export const loader = async ({ request }: DataFunctionArgs) => {
//   const { admin } = await authenticate.admin(request);

//   const response = await admin.graphql(`
//     {
//       metafieldDefinitions(ownerType: PRODUCT, first: 1, namespace: "custom", key: "iframe_url") {
//         edges {
//           node {
//             id
//           }
//         }
//       }
//     }
//   `);

//   const data = await response.json();
//   const exists = data?.data?.metafieldDefinitions?.edges?.length > 0;
//   return json<{ metafieldExists: boolean }>({ metafieldExists: exists });
// };

// export default function Index() {
//   const { metafieldExists } = useLoaderData<{ metafieldExists: boolean }>();
//   const fetcher = useFetcher();

//   const initializeApp = () => {
//     console.log('clicke initializeApp');
//     fetcher.submit(null, { method: "post", action: "/api/metafieldsinit" });
//   };

//   return (
//     <Page title="Iframe URL Manager">
//       <Layout>
//         <Layout.Section>
//           {metafieldExists ? (
//             <ProductTable />
//           ) : (
//             <Card sectioned>
//               <Text variant="headingMd">Initialize the App</Text>
//               <Text>
//                 Click the button below to create the required metafield definition.
//               </Text>
//               <Button
//                 onClick={initializeApp}
//                 loading={fetcher.state === "submitting"}
//               >
//                 Initialize App
//               </Button>
//             </Card>
//           )}
//         </Layout.Section>
//       </Layout>
//     </Page>
//   );
// }
