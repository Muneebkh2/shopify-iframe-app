// app/root.tsx
import { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links, Meta, Outlet, Scripts,
  ScrollRestoration, useLoaderData,
} from "@remix-run/react";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-remix/react";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { authenticate } = await import("./shopify.server");
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const host = url.searchParams.get("host");

  return json({
    apiKey: process.env.SHOPIFY_API_KEY,
    host,
    shop: session.shop,
  });
};

export default function App() {
  const { apiKey, host } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <ShopifyAppProvider apiKey={apiKey} host={host} forceRedirect>
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

// import type { LinksFunction } from "@remix-run/node";
// import {Add commentMore actions
//   Links,
//   Meta,
//   Outlet,
//   Scripts,
//   ScrollRestoration
// } from "@remix-run/react";
// import { AppProvider } from "@shopify/polaris";
// import enTranslations from "@shopify/polaris/locales/en.json";

// import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

// export const links: LinksFunction = () => [
//   { rel: "stylesheet", href: polarisStyles },
//   { rel: "preconnect", href: "https://cdn.shopify.com" },
//   {
//     rel: "stylesheet",
//     href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
//   }
// ];

// export default function App() {
//   return (
//     <html lang="en">
//       <head>
//         <meta charSet="utf-8" />
//         <meta name="viewport" content="width=device-width,initial-scale=1" />
//         <meta name="shopify-api-key" content="%process.env.SHOPIFY_API_KEY%" />
//         <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
//         <Meta />
//         <Links />
//       </head>
//       <body>
//         <AppProvider i18n={enTranslations}>
//           <Outlet />
//         </AppProvider>
//         <ScrollRestoration />
//         <Scripts />
//       </body>
//     </html>
//   );
// }
