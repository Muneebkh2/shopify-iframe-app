// app/routes/index.tsx
import { json } from "@remix-run/node";
import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Text, Button, Banner } from "@shopify/polaris";
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

  // Local UI state for actions and messages
  const [actionInProgress, setActionInProgress] = useState<"init" | "inject" | "uninstall" | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Listen to changes in fetcher so we know when an action finished
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success === true && fetcher.data.message) {
        setSuccessMessage(fetcher.data.message);
        // Auto dismiss after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else if (fetcher.data.success === false) {
        const errorMessage =
          fetcher.data.error || fetcher.data.errors?.[0]?.message || "Unknown error";
        setInitError(errorMessage);
        setTimeout(() => {
          setInitError(null);
        }, 5000);
      }
      setActionInProgress(null); // Reset action state after completion
    }
  }, [fetcher]);

  const initializeApp = () => {
    setActionInProgress("init");
    fetcher.submit(null, {
      method: "POST",
      action: "/api/metafield-init",
    });
  };

  const initializeThemeUpdate = () => {
    setActionInProgress("inject");
    fetcher.submit(null, {
      method: "POST",
      action: "/api/theme-inject",
    });
  };

  const handleUninstall = () => {
    if (confirm("Are you sure you want to uninstall and revert theme changes?")) {
      setActionInProgress("uninstall");
      fetcher.submit(null, {
        method: "POST",
        action: "/api/theme-revert-uninstall",
      });
    }
  };

  return (
    <Page title="Iframe URL Manager">
      <Layout>
        <Layout.Section>
          {justInitialized && (
            <Banner title="App initialized successfully" status="success" />
          )}

          {successMessage && (
            <Banner title={successMessage} status="success" />
          )}

          {initError && (
            <Banner title="Something went wrong" status="critical">
              <p>{initError}</p>
            </Banner>
          )}

          {metafieldExists ? (
            <>
              <Card sectioned>
                <Button
                  onClick={initializeThemeUpdate}
                  loading={actionInProgress === "inject" && fetcher.state === "submitting"}
                >
                  Inject Code
                </Button>
                <Button
                  onClick={handleUninstall}
                  tone="critical"
                  variant="primary"
                  loading={actionInProgress === "uninstall" && fetcher.state === "submitting"}
                  style={{ marginTop: "1rem" }}
                >
                  Uninstall App
                </Button>
              </Card>
              <ProductTable />
            </>
          ) : (
            <Card sectioned>
              <Text variant="headingMd">Initialize the App</Text>
              <Text>
                Click the button below to create and pin the iframe_url metafield for product variants.
              </Text>
              <Button
                onClick={initializeApp}
                loading={actionInProgress === "init" && fetcher.state === "submitting"}
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
