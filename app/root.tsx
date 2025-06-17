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
  const url = new URL(request.url);
  const host = url.searchParams.get("host");
  if (!host) {
    throw new Response("Missing host", { status: 400 });
  }

  const { authenticate } = await import("./shopify.server");
  const { session } = await authenticate.admin(request);

  return json({
    apiKey: process.env.SHOPIFY_API_KEY,
    host,
    shop: session.shop,
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
