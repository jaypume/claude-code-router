import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyProfileConfig } from "@ccr/core/profiles/service.ts";
import { createDefaultAppConfig } from "@ccr/core/config/default-config.ts";

test("profile enable writes managed env into settings.json and disable removes it", { skip: !process.env.CCR_INTERNAL_HOME_DIR }, async () => {
  const root = process.env.CCR_INTERNAL_HOME_DIR;
  const settingsFile = path.join(root, ".claude", "settings.json");
  mkdirSync(path.dirname(settingsFile), { recursive: true });
  // 模拟用户文件：自定义顶层字段 + 真实场景 env（managed keys + 用户 key + 用户自定义 *_MODEL_NAME）
  writeFileSync(settingsFile, `${JSON.stringify({
    effortLevel: "high",
    enabledPlugins: { "some-plugin": true },
    env: {
      ANTHROPIC_AUTH_TOKEN: "user-token",
      ANTHROPIC_BASE_URL: "https://open.bigmodel.cn/api/anthropic",
      ANTHROPIC_DEFAULT_HAIKU_MODEL: "glm-5.2",
      ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME: "glm-5.2",
      ANTHROPIC_DEFAULT_OPUS_MODEL: "glm-5.2[1M]",
      ANTHROPIC_DEFAULT_OPUS_MODEL_NAME: "glm-5.2",
      ANTHROPIC_DEFAULT_SONNET_MODEL: "glm-5.2[1M]",
      ANTHROPIC_DEFAULT_SONNET_MODEL_NAME: "glm-5.2",
      ANTHROPIC_MODEL: "glm-5.1[1M]",
      USER_VALUE: "kept"
    }
  }, null, 2)}\n`);

  const config = createDefaultAppConfig();
  config.profile.profiles = [{
    agent: "claude-code",
    enabled: true,
    scope: "global",
    surface: "cli",
    settingsFile,
    model: "zhipuai/glm-5.2",
    fableModel: "zhipuai/glm-5.2",
    haikuModel: "zhipuai/glm-5.2",
    sonnetModel: "zhipuai/glm-5.2",
    opusModel: "zhipuai/glm-5.2",
    smallFastModel: "zhipuai/glm-5.2",
    id: "profile-1",
    name: "Claude Code",
    managedCompact: false,
    env: { CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: "0" }
  }];
  config.Providers = [{
    name: "zhipuai",
    api_base_url: "https://open.bigmodel.cn/api/anthropic",
    api_key: "test-key",
    models: ["zhipuai/glm-5.2"]
  }];

  const r1 = await applyProfileConfig(config);
  const claude1 = r1.clients.find((c) => c.client === "claude-code");
  assert.equal(claude1?.ok, true, `enable apply failed: ${claude1?.message}`);
  let s = JSON.parse(readFileSync(settingsFile, "utf8"));
  assert.equal(typeof s.env?.ANTHROPIC_BASE_URL, "string", "ANTHROPIC_BASE_URL should be written when enabled");
  assert.equal(s.env?.USER_VALUE, "kept", "user env value must be preserved");
  assert.equal(s.env?.ANTHROPIC_AUTH_TOKEN, undefined, "managed apply removes ANTHROPIC_AUTH_TOKEN");
  assert.equal(s.effortLevel, "high", "user top-level fields must be preserved");
  assert.deepEqual(s.enabledPlugins, { "some-plugin": true }, "user top-level fields must be preserved");

  config.profile.profiles[0].enabled = false;
  const r2 = await applyProfileConfig(config);
  const claude2 = r2.clients.find((c) => c.client === "claude-code");
  assert.equal(claude2?.ok, true, `disable apply failed: ${claude2?.message}`);
  s = JSON.parse(readFileSync(settingsFile, "utf8"));
  assert.equal(s.env?.USER_VALUE, "kept", "user env value must be preserved after disable");
  assert.equal("ANTHROPIC_BASE_URL" in s.env, false, "managed ANTHROPIC_BASE_URL should be removed when disabled");
  assert.equal("ANTHROPIC_MODEL" in s.env, false, "managed model env should be removed when disabled");
  assert.equal(s.effortLevel, "high", "user top-level fields must be preserved after disable");
});
