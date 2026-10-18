// @ts-check
import { defineConfig } from "astro/config";

// Set SITE_URL once the domain is chosen (e.g. https://hopeoutreach.or.ke). Until then the
// site works on its *.workers.dev address, without canonical or share-preview URLs.
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  trailingSlash: "ignore",
  build: { format: "directory" },
});
