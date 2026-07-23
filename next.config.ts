import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? "/nguyen-long-xap-xam" : undefined,
  assetPrefix: isGitHubPages ? "/nguyen-long-xap-xam/" : undefined,
  trailingSlash: isGitHubPages,
};

export default nextConfig;
