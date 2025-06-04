// app/utils/themeAssetManager.ts
import fs from "fs/promises";
import path from "path";

export async function injectCustomCssAsset({
  shop,
  themeId,
  fetchShopify,
}: {
  shop: string;
  themeId: string;
  fetchShopify: (url: string, options?: RequestInit) => Promise<any>;
}) {
  const cssAssetKey = "assets/component-custom-iframe.css";

  // Adjust path based on your project root
  const localCssPath = path.resolve("iframe-assets/component-custom-iframe.css");

  let cssContent: string;
  try {
    cssContent = await fs.readFile(localCssPath, "utf-8");
  } catch (err) {
    throw new Error("Missing local CSS file: iframe-assets/component-custom-iframe.css");
  }

  const uploadCssRes = await fetchShopify(`themes/${themeId}/assets.json`, {
    method: "PUT",
    body: JSON.stringify({
      asset: {
        key: cssAssetKey,
        value: cssContent,
      },
    }),
  });

  if (!uploadCssRes.asset) {
    throw new Error("Failed to upload component-custom-iframe.css");
  }

  // Inject link tag into layout/theme.liquid
  const themeLiquidKey = "layout/theme.liquid";
  const themeLiquidRes = await fetchShopify(`themes/${themeId}/assets.json?asset[key]=${themeLiquidKey}`);
  const themeLiquidContent = themeLiquidRes.asset?.value;

  if (!themeLiquidContent) {
    throw new Error("layout/theme.liquid not found");
  }

  const cssTag = `{{ 'component-custom-iframe.css' | asset_url | stylesheet_tag }}`;
  const alreadyIncluded = themeLiquidContent.includes(cssTag);

  if (!alreadyIncluded) {
    const headInjectPattern = /<head[^>]*>/i;
    const updatedThemeLiquid = themeLiquidContent.replace(headInjectPattern, `$&\n  ${cssTag}`);

    const uploadThemeLiquidRes = await fetchShopify(`themes/${themeId}/assets.json`, {
      method: "PUT",
      body: JSON.stringify({
        asset: {
          key: themeLiquidKey,
          value: updatedThemeLiquid,
        },
      }),
    });

    if (!uploadThemeLiquidRes.asset) {
      throw new Error("Failed to inject CSS tag into layout/theme.liquid");
    }
  }
}
