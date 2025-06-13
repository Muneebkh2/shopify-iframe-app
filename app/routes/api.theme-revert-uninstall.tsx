import { json } from "@remix-run/node";
import fs from "fs/promises";
import path from "path";

export const action = async ({ request }: { request: Request }) => {
  const PRIVATE_APP_TOKEN = process.env.PRIVATE_APP_TOKEN || "";
  const shop = process.env.SHOPIFY_SHOP_DOMAIN || "";
  const backupDir = path.resolve("backups"); // Match with your backup path

  if (!PRIVATE_APP_TOKEN || !shop) {
    return json({ success: false, error: "Missing private app credentials" }, { status: 500 });
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
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse JSON:", text);
      throw new Error("Invalid JSON response from Shopify");
    }
  };

  const themeRes = await fetchShopify("themes.json");
  const mainTheme = themeRes.themes?.find((t: any) => t.role?.toLowerCase() === "main");

  if (!mainTheme?.id) {
    return json({ success: false, error: "Main theme not found" }, { status: 404 });
  }

  const themeId = mainTheme.id;
  const filesToRestore = ["snippets/card-product.liquid", "snippets/product-thumbnail.liquid"];
  const shopSlug = shop.replace(/\W+/g, "-");

  try {
    for (const key of filesToRestore) {
      const assetSlug = key.replace(/\//g, "_").replace(/\.liquid$/, "");
      const allFiles = await fs.readdir(backupDir);
      const matchingBackups = allFiles
        .filter((file) =>
          file.startsWith(`${shopSlug}_${themeId}_${assetSlug}`) && file.endsWith(".liquid")
        )
        .sort((a, b) => {
          const getTime = (f: string) => parseInt(f.split("_").pop()?.replace(".liquid", "") || "0", 10);
          return getTime(b) - getTime(a);
        });

      if (matchingBackups.length === 0) {
        return json({ success: false, error: `No backup found for ${key}` }, { status: 404 });
      }

      const latestBackupFile = path.join(backupDir, matchingBackups[0]);
      const originalContent = await fs.readFile(latestBackupFile, "utf-8");

      const uploadRes = await fetchShopify(`themes/${themeId}/assets.json`, {
        method: "PUT",
        body: JSON.stringify({ asset: { key, value: originalContent } }),
      });

      if (!uploadRes.asset) {
        return json({ success: false, error: `Failed to restore ${key}` }, { status: 500 });
      }

      console.log(`✅ Restored ${key} from ${latestBackupFile}`);
    }

    // Delete CSS file
    const cssAssetKey = "assets/component-custom-iframe.css";
    await fetchShopify(`themes/${themeId}/assets.json`, {
      method: "DELETE",
      body: JSON.stringify({ asset: { key: cssAssetKey } }),
    });
    console.log(`🧹 Removed ${cssAssetKey}`);

    // Remove CSS tag from layout/theme.liquid
    const layoutKey = "layout/theme.liquid";
    const layoutAsset = await fetchShopify(`themes/${themeId}/assets.json?asset[key]=${layoutKey}`);

    if (layoutAsset.asset?.value) {
      const tag = `{{ 'component-custom-iframe.css' | asset_url | stylesheet_tag }}`;
      const newContent = layoutAsset.asset.value.replace(tag, "").replace(/^\s*\n/gm, "");

      const uploadLayoutRes = await fetchShopify(`themes/${themeId}/assets.json`, {
        method: "PUT",
        body: JSON.stringify({ asset: { key: layoutKey, value: newContent } }),
      });

      if (!uploadLayoutRes.asset) {
        return json({ success: false, error: "Failed to clean layout/theme.liquid" }, { status: 500 });
      }

      console.log(`🧼 Cleaned CSS tag from ${layoutKey}`);
    }

    return json({ success: true, message: "Theme files and CSS reverted successfully." });
  } catch (err: any) {
    console.error("❌ Revert error:", err);
    return json({ success: false, error: err.message || "Unknown error during revert" }, { status: 500 });
  }
};
