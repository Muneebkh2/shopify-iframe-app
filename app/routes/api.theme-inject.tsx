// app/routes/api/theme-inject-rest.tsx
import { json } from "@remix-run/node";

export const action = async ({ request }: { request: Request }) => {
  const PRIVATE_APP_TOKEN = process.env.PRIVATE_APP_TOKEN || "";
  const shop = process.env.SHOPIFY_SHOP_DOMAIN || "";

  if (!PRIVATE_APP_TOKEN || !shop) {
    return new Response(JSON.stringify({ success: false, errors: ["Missing private app credentials"] }), { status: 500 });
  }

  const fetchShopify = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(`https://${shop}/admin/api/2024-10/${url}`, {
      ...options,
      headers: {
        "X-Shopify-Access-Token": PRIVATE_APP_TOKEN,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    return res.json();
  };

  const themesRes = await fetchShopify("themes.json");
  const mainTheme = themesRes.themes?.find((t: any) => t.role?.toLowerCase() === "main");
  if (!mainTheme?.id) {
    return new Response(JSON.stringify({ success: false, errors: ["Main theme not found"] }), { status: 404 });
  }
  const themeId = mainTheme.id;

  const filesToUpdate = [
    {
      key: "snippets/product-thumbnail.liquid",
      injectPattern: /<div[^>]*class="product-media-container[^>]*>.*?<\/div>/s,
      iframeLogic: `
{%- if product.metafields.custom.iframe_url != blank -%}
  <div class="product-media-container">
    <iframe
      src="{{ product.metafields.custom.iframe_url }}"
      width="100%"
      height="400px"
      frameborder="0"
      allowfullscreen
      style="width: 100%; height: 400px; border: none; margin-bottom: 20px;"
    ></iframe>
  </div>
{%- else -%}`
    },
    {
      key: "snippets/card-product.liquid",
      injectPattern: /<div[^>]*class="card__media[^>]*>.*?<\/div>/s,
      iframeLogic: `
{%- if card_product.metafields.custom.iframe_url != blank -%}
  <div class="card__media">
    <div class="media media--transparent media--hover-effect">
      <iframe
        src="{{ card_product.metafields.custom.iframe_url }}"
        width="100%"
        height="100%"
        frameborder="0"
        allowfullscreen
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
      ></iframe>
    </div>
  </div>
{%- else -%}`
    }
  ];

  for (const { key, injectPattern, iframeLogic } of filesToUpdate) {
    const assetRes = await fetchShopify(`themes/${themeId}/assets.json?asset[key]=${key}`);
    const originalContent = assetRes.asset?.value;

    if (!originalContent) {
      return new Response(JSON.stringify({ success: false, errors: [`Original asset '${key}' not found or empty`] }), { status: 400 });
    }

    if (originalContent.includes("iframe_url")) continue;

    if (!injectPattern.test(originalContent)) {
      return new Response(JSON.stringify({ success: false, errors: [`Injection point not found in '${key}'`] }), { status: 400 });
    }

    const updatedContent = originalContent.replace(injectPattern, `${iframeLogic}\n$&\n{%- endif -%}`);

    const uploadRes = await fetchShopify(`themes/${themeId}/assets.json`, {
      method: "PUT",
      body: JSON.stringify({
        asset: {
          key,
          value: updatedContent,
        },
      }),
    });

    if (!uploadRes.asset) {
      return new Response(JSON.stringify({ success: false, errors: ["Failed to update asset", key] }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ success: true, message: "Iframe injected successfully" }), { status: 200 });
};




// // app/routes/api/theme-inject-rest.tsx
// import { json } from "@remix-run/node";

// export const action = async ({ request }: { request: Request }) => {
//   const PRIVATE_APP_TOKEN = process.env.PRIVATE_APP_TOKEN || ""; // e.g., 'shpat_1234567890abcdef'
//   const shop = process.env.SHOPIFY_SHOP_DOMAIN || ""; // e.g., 'merchant-shop.myshopify.com'

//   if (!PRIVATE_APP_TOKEN || !shop) {
//     return new Response(JSON.stringify({ success: false, errors: ["Missing private app credentials"] }), { status: 500 });
//   }

//   const fetchShopify = async (url: string, options: RequestInit = {}) => {
//     const res = await fetch(`https://${shop}/admin/api/2024-10/${url}`, {
//       ...options,
//       headers: {
//         "X-Shopify-Access-Token": PRIVATE_APP_TOKEN,
//         "Content-Type": "application/json",
//         ...options.headers,
//       },
//     });
//     console.log("Fetching Shopify API: ", url + " and token:", PRIVATE_APP_TOKEN);
//     return res.json();
//   };

//   // Step 1: Get the main theme ID
//   const themesRes = await fetchShopify("themes.json");
//   console.log("Themes response:", themesRes);
//   const mainTheme = themesRes.themes?.find((t: any) => t.role?.toLowerCase() === "MAIN" || t.role?.toLowerCase() === "main");
//   if (!mainTheme?.id) {
//     return new Response(JSON.stringify({ success: false, errors: ["Main theme not found1"] }), { status: 404 });
//   }
//   const themeId = mainTheme.id;

//   // Step 2: Define asset targets and iframe logic
//   const filesToUpdate = [
//     {
//       key: "snippets/product-thumbnail.liquid",
//       matchPattern: /<div[^>]*class="product-media-container[^>]*>.*?<\/div>/s,
//       iframeLogic: `
// {%- if product.metafields.custom.iframe_url_view != blank -%}
//   <div class="product-media-container">
//     <iframe
//       src="{{ product.metafields.custom.iframe_url_view }}"
//       width="100%"
//       height="400px"
//       frameborder="0"
//       allowfullscreen
//       style="width: 100%; height: 400px; border: none; margin-bottom: 20px;"
//     ></iframe>
//   </div>
// {%- endif -%}`
//     },
//     {
//       key: "snippets/product-card.liquid",
//       matchPattern: /{%-?\s*if card_product\.featured_media[^%]*%}(.*?)\{%-?\s*endif\s*-?%\}/s,
//       iframeLogic: `
// {%- if card_product.metafields.custom.iframe_url_view != blank -%}
//   <div class="card__media">
//     <div class="media media--transparent media--hover-effect">
//       <iframe
//         src="{{ card_product.metafields.custom.iframe_url_view }}"
//         width="100%"
//         height="100%"
//         frameborder="0"
//         allowfullscreen
//         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
//       ></iframe>
//     </div>
//   </div>
// {%- else -%}`
//     }
//   ];

//   for (const { key, matchPattern, iframeLogic } of filesToUpdate) {
//     const assetRes = await fetchShopify(`themes/${themeId}/assets.json?asset[key]=${key}`);
//     const originalContent = assetRes.asset?.value;

//     if (!originalContent) {
//       return new Response(JSON.stringify({ success: false, errors: [`Original asset '${key}' not found or empty`] }), { status: 400 });
//     }

//     // Skip if already injected
//     if (originalContent.includes("iframe_url_view")) continue;

//     const updatedContent = originalContent.replace(matchPattern, `${iframeLogic}\n$&\n{%- endif -%}`);

//     if (!updatedContent || updatedContent === originalContent) {
//       return new Response(JSON.stringify({ success: false, errors: [`Pattern not found or content unchanged in '${key}'`] }), { status: 400 });
//     }

//     const uploadRes = await fetchShopify(`themes/${themeId}/assets.json`, {
//       method: "PUT",
//       body: JSON.stringify({
//         asset: {
//           key,
//           value: updatedContent,
//         },
//       }),
//     });

//     if (!uploadRes.asset) {
//       console.error("Failed to update asset:", uploadRes);
//       return new Response(JSON.stringify({ success: false, errors: ["Failed to update asset", key] }), { status: 500 });
//     }
//   }

//   return new Response(JSON.stringify({ success: true, message: "Iframe injected successfully" }), { status: 200 });
// };
