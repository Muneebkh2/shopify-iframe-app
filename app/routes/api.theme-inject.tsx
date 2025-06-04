// app/routes/api/theme-inject-rest.tsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { backupThemeAssetLocally } from "../utils/backup";
import { injectCustomCssAsset } from "../utils/themeAssetManager";


export const action = async ({ request }: { request: Request }) => {
  const PRIVATE_APP_TOKEN = process.env.PRIVATE_APP_TOKEN || "";
  const shop = process.env.SHOPIFY_SHOP_DOMAIN || "";

  if (!PRIVATE_APP_TOKEN || !shop) {
    return new Response(JSON.stringify({ success: false, errors: ["Missing private app credentials"] }), { status: 500 });
  }

  // const fetchShopify = async (url: string, options: RequestInit = {}) => {
  //   const res = await fetch(`https://${shop}/admin/api/2024-10/${url}`, {
  //     ...options,
  //     headers: {
  //       "X-Shopify-Access-Token": PRIVATE_APP_TOKEN,
  //       "Content-Type": "application/json",
  //       ...options.headers,
  //     },
  //   });
  //   return res.json();
  // };
  const fetchShopify = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(`https://${shop}/admin/api/2024-10/${url}`, {
      ...options,
      headers: {
        "X-Shopify-Access-Token": PRIVATE_APP_TOKEN,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse JSON from Shopify:", text);
      throw new Error(`Invalid JSON response from Shopify for URL: ${url}`);
    }
  };


  const themesRes = await fetchShopify("themes.json");
  console.log("Themes response:", themesRes);
  const mainTheme = themesRes.themes?.find((t: any) => t.role?.toLowerCase() === "main");
  if (!mainTheme?.id) {
    return new Response(JSON.stringify({ success: false, errors: ["Main theme not found"] }), { status: 404 });
  }
  console.log("Main theme found:", mainTheme);
  const themeId = mainTheme.id;

  // importing the CSS asset
  try {
    await injectCustomCssAsset({ shop, themeId, fetchShopify });
  } catch (err) {
    return json({ success: false, error: err.message });
  }

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
      height="600px"
      frameborder="0"
      allowfullscreen
      style="width: 100%; height: 600px; border: none; margin-bottom: 20px;"
    ></iframe>
  </div>{%- else -%}`,
    },
    {
    key: "snippets/card-product.liquid",
    injectPattern: /<div[^>]*class="card__media[^>]*>.*?<\/div>/s,
    iframeLogic: `
{%- if card_product.metafields.custom.iframe_url != blank -%}
  <div class="card__media">
    <div class="media media--transparent media--hover-effect" style="position: static;">
      <iframe
        src="{{ card_product.metafields.custom.iframe_url }}"
        width="100%"
        height="100%"
        frameborder="0"
        allowfullscreen
        style="position: relative; top: 0; left: 0; width: 100%; height: 100%; border-radius: 10px; pointer-events: auto; z-index: 9999;"
      ></iframe>
    </div>
  </div>
  {%- else -%}`,
  },
  ];

  for (const { key, injectPattern, iframeLogic } of filesToUpdate) {
    console.log(`Fetching asset for key: ${key}`);

    const assetRes = await fetchShopify(`themes/${themeId}/assets.json?asset[key]=${key}`);
    const originalContent = assetRes.asset?.value;

    console.log(`Processing asset: ${key}`, originalContent ? `Content length: ${originalContent.length}` : "No content found");
    if (!originalContent) {
      return new Response(JSON.stringify({ success: false, errors: [`Original asset '${key}' not found or empty`] }), { status: 400 });
    }

     try {
      const backupFile = await backupThemeAssetLocally({
        shop,
        themeId,
        assetKey: key,
        content: originalContent,
      });
      console.log(`✅ Backup created: ${backupFile}`);
    } catch (err) {
      console.error("❌ Backup failed:", err);
      return new Response(JSON.stringify({ success: false, errors: ["Failed to save local backup"] }), { status: 500 });
    }

    // if (originalContent.includes("iframe_url")) continue;

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

    console.log(`Upload response for ${key}:`, uploadRes);
    if (!uploadRes.asset) {
      return new Response(JSON.stringify({ success: false, errors: ["Failed to update asset", key] }), { status: 500 });
    }
  }

  return json({ success: true, message: "Iframe injected successfully" });

  // return new Response(JSON.stringify({ success: true, message: "Iframe injected successfully" }), { status: 200 });
};
