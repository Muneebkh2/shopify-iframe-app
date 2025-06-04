// app/utils/backup.ts
import fs from "fs/promises";
import path from "path";

export async function backupThemeAssetLocally({
  shop,
  themeId,
  assetKey,
  content,
}: {
  shop: string;
  themeId: string | number;
  assetKey: string;
  content: string;
}) {
  const timestamp = Date.now();
  const assetSlug = assetKey.replace(/\//g, "_").replace(/\.liquid$/, "");
  const shopSlug = shop.replace(/\W+/g, "-");
  const backupDir = path.resolve("backups");
  const backupFilename = `${shopSlug}_${themeId}_${assetSlug}_${timestamp}.liquid`;
  const backupPath = path.join(backupDir, backupFilename);

  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(backupPath, content);

  return backupFilename;
}
