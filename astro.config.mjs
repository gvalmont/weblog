import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://blog.valmont.dev",
  integrations: [mdx()],
  output: "static",
  trailingSlash: "always",
});
