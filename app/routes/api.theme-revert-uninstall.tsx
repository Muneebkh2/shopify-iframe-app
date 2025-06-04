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
    return res.json();
  };

  // 1. Get main theme
  const themesRes = await fetchShopify("themes.json");
  const mainTheme = themesRes.themes?.find((t: any) => t.role?.toLowerCase() === "main");

  if (!mainTheme?.id) {
    return json({ success: false, error: "Main theme not found" }, { status: 404 });
  }

  const themeId = mainTheme.id;
  const filesToRestore = ["snippets/card-product.liquid", "snippets/product-thumbnail.liquid"];

  const shopSlug = shop.replace(/\W+/g, "-");

  try {
    for (const key of filesToRestore) {
      const assetSlug = key.replace(/\//g, "_").replace(/\.liquid$/, "");

      // 2. Find all matching backups for this shop + theme + file
      const allFiles = await fs.readdir(backupDir);
      const matchingBackups = allFiles
        .filter((file) =>
          file.startsWith(`${shopSlug}_${themeId}_${assetSlug}`) && file.endsWith(".liquid")
        )
        .sort((a, b) => {
          const getTime = (f: string) => parseInt(f.split("_").pop()?.replace(".liquid", "") || "0", 10);
          return getTime(b) - getTime(a); // Descending order (latest first)
        });

      if (matchingBackups.length === 0) {
        return json({ success: false, error: `No backup found for ${key}` }, { status: 404 });
      }

      const latestBackupFile = path.join(backupDir, matchingBackups[0]);
      const originalContent = await fs.readFile(latestBackupFile, "utf-8");

      const uploadRes = await fetchShopify(`themes/${themeId}/assets.json`, {
        method: "PUT",
        body: JSON.stringify({
          asset: {
            key,
            value: originalContent,
          },
        }),
      });

      if (!uploadRes.asset) {
        return json({ success: false, error: `Failed to restore ${key}` }, { status: 500 });
      }

      console.log(`✅ Restored ${key} from ${latestBackupFile}`);
    }

    return json({ success: true, message: "Theme files reverted from latest backup successfully." });
  } catch (err: any) {
    console.error("❌ Revert error:", err);
    return json({ success: false, error: err.message || "Unknown error during revert" }, { status: 500 });
  }
};








// // app/routes/api/theme-revert-uninstall.tsx
// import { json } from "@remix-run/node";
// import fs from "fs/promises";
// import path from "path";

// export const action = async ({ request }: { request: Request }) => {
//   const PRIVATE_APP_TOKEN = process.env.PRIVATE_APP_TOKEN || "";
//   const shop = process.env.SHOPIFY_SHOP_DOMAIN || "";
//   const backupDir = path.resolve("./theme-backups");

//   if (!PRIVATE_APP_TOKEN || !shop) {
//     return json({ success: false, error: "Missing private app credentials" }, { status: 500 });
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
//     return res.json();
//   };

//   const themesRes = await fetchShopify("themes.json");
//   const mainTheme = themesRes.themes?.find((t: any) => t.role?.toLowerCase() === "main");

//   if (!mainTheme?.id) {
//     return json({ success: false, error: "Main theme not found" }, { status: 404 });
//   }

//   const themeId = mainTheme.id;
//   const filesToRestore = ["snippets/card-product.liquid", "snippets/product-thumbnail.liquid"];

//   try {
//     for (const key of filesToRestore) {
//       const filePath = path.join(backupDir, key.replaceAll("/", "__"));
//       const originalContent = await fs.readFile(filePath, "utf-8");

//       const uploadRes = await fetchShopify(`themes/${themeId}/assets.json`, {
//         method: "PUT",
//         body: JSON.stringify({
//           asset: {
//             key,
//             value: originalContent,
//           },
//         }),
//       });

//       if (!uploadRes.asset) {
//         return json({ success: false, error: `Failed to restore ${key}` }, { status: 500 });
//       }
//     }

//     // Optional: Uninstall app logic (if you're using GraphQL or REST for app uninstallation, insert here)
//     // Note: Shopify does not support uninstalling apps via API from the app itself (only by merchant)

//     return json({ success: true, message: "Theme reverted successfully. Please uninstall manually from the Shopify admin." });
//   } catch (err: any) {
//     return json({ success: false, error: err.message || "Unknown error during revert" }, { status: 500 });
//   }
// };
