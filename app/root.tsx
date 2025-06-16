// app/root.tsx
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData
} from "@remix-run/react";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-remix/react";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // This authenticates the admin session and attaches App Bridge headers
  const { admin } = await import("./shopify.server").then((mod) =>
    mod.default.authenticate.admin(request)
  );

  // Provide what's needed for the front end: API key, shop, and host
  const url = new URL(request.url);
  const host = url.searchParams.get("host")!;
  const shop = admin.shop;

  return json({
    apiKey: process.env.SHOPIFY_API_KEY,
    host,
    shop,
  });
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "preconnect", href: "https://cdn.shopify.com" },
  {
    rel: "stylesheet",
    href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
  }
];

export default function App() {
    const { apiKey, host, shop } = useLoaderData<typeof loader>();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ShopifyAppProvider
          apiKey={apiKey}
          shopOrigin={shop}
          host={host}
          forceRedirect
        >
          <PolarisProvider i18n={enTranslations}>
            <Outlet />
          </PolarisProvider>
        </ShopifyAppProvider>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
