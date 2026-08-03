import {
  OPEN_CODE_GO_AUTH_COOKIE_PLACEHOLDER,
  OPEN_CODE_GO_WORKSPACE_PLACEHOLDER
} from "@ccr/core/contracts/app";
import type { ProviderAccountConfig } from "@ccr/core/contracts/app";
import type { ProviderPreset } from "@ccr/core/providers/presets/types";

// 与 agents/local-providers/opencode.ts 的 openCodeGoProviderAccountConfig 保持一致；
// 此处内联是为了避免 UI 打包路径引入 agents 层的 node:fs 依赖。
const openCodeGoProviderAccountConfig: ProviderAccountConfig = {
  connectors: [
    {
      auth: "none",
      endpoint: `https://opencode.ai/workspace/${OPEN_CODE_GO_WORKSPACE_PLACEHOLDER}/go`,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Cookie: `auth=${OPEN_CODE_GO_AUTH_COOKIE_PLACEHOLDER}`,
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      mapping: { meters: [] },
      parser: "opencode-go-usage",
      type: "http-json"
    }
  ],
  enabled: true
};

export const openCodeGoProviderPreset: ProviderPreset = {
  account: openCodeGoProviderAccountConfig,
  aliases: ["opencode go", "opencode go plan", "go plan", "opencode go usage"],
  defaultModelDisplayNames: {
    "gpt-5.6-luna": "GPT-5.6 Luna"
  },
  defaultModels: ["gpt-5.6-luna"],
  endpoints: [
    {
      baseUrl: "https://opencode.ai/zen/go/v1",
      protocols: ["openai_responses"],
      websiteUrl: "https://opencode.ai/workspace"
    }
  ],
  id: "opencode-go",
  name: "OpenCode Go",
  websiteUrl: "https://opencode.ai"
};
