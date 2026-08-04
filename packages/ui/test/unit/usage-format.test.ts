import assert from "node:assert/strict";
import test from "node:test";
import { applyLogSelection, formatLogTokenSummary, logRequestModel, logResponseModel, summarizeLogSelections } from "@ccr/ui/pages/home/shared/logs.ts";
import { formatCompactNumber, formatUsdCost as formatHomeUsdCost } from "@ccr/ui/pages/home/shared/usage.ts";
import { formatUsdCost as formatTrayUsdCost } from "@ccr/ui/pages/tray/shared.tsx";
import type { RequestLogEntry } from "@ccr/core/contracts/app.ts";

test("formatCompactNumber can be bound to the UI language locale", () => {
  assert.equal(formatCompactNumber(123456, "en-US"), "123.5K");
  assert.equal(formatCompactNumber(123456, "zh-CN"), "12.3万");
});

test("formatUsdCost always uses a plain $ prefix", () => {
  assert.doesNotThrow(() => formatHomeUsdCost(100));
  assert.doesNotThrow(() => formatTrayUsdCost(100));
  assert.equal(formatHomeUsdCost(0.000212), "$0.0002");
  assert.equal(formatHomeUsdCost(0.02), "$0.02");
  assert.equal(formatHomeUsdCost(23.45), "$23.45");
  assert.equal(formatHomeUsdCost(123.45), "$123");
  assert.equal(formatTrayUsdCost(123.45), "$123");
  assert.equal(formatHomeUsdCost(100), "$100");
  assert.equal(formatHomeUsdCost(undefined), "$0.00");
});

test("formatLogTokenSummary uses compact K/M units with emoji markers", () => {
  const entry: RequestLogEntry = {
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    client: "test",
    costUsd: 0,
    createdAt: "2026-06-30T00:00:00.000Z",
    credentialChain: [],
    credentialSaturated: false,
    durationMs: 10,
    id: 1,
    inputTokens: 123456,
    isStream: false,
    method: "POST",
    model: "test-model",
    ok: true,
    outputTokens: 12000,
    path: "/v1/messages",
    provider: "test-provider",
    reasoningTokens: 0,
    requestBody: { encoding: "utf8", text: "" },
    requestHeaders: {},
    requestId: "req_test",
    retryAttempts: [],
    responseHeaders: {},
    statusCode: 200,
    totalTokens: 135456,
    url: "https://example.test/v1/messages"
  };

  assert.equal(
    formatLogTokenSummary(entry),
    "🔼\u2007123K\u2007\u2007🔽\u2007\u200712K"
  );
  assert.equal(
    formatLogTokenSummary({
      ...entry,
      cacheReadTokens: 51200,
      cacheWriteTokens: 300,
      reasoningTokens: 1500,
      totalTokens: 188456
    }),
    "🔼\u2007123K\u2007\u2007🔽\u2007\u200712K\u2007\u2007⚡️\u2007\u200751K\u2007\u2007⚡️\u2007\u2007300\u2007\u2007🧠\u20071.5K"
  );
  assert.equal(
    formatLogTokenSummary({ ...entry, inputTokens: 18, outputTokens: 0, totalTokens: 18 }),
    "🔼\u2007\u2007\u200718\u2007\u2007🔽\u2007\u2007\u2007\u20070"
  );
  assert.equal(formatLogTokenSummary({ ...entry, inputTokens: 0, outputTokens: 0, totalTokens: 0 }), "-");
});

test("summarizeLogSelections sums token buckets and cost across rows", () => {
  const base: RequestLogEntry = {
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    client: "test",
    costUsd: 0,
    createdAt: "2026-06-30T00:00:00.000Z",
    credentialChain: [],
    credentialSaturated: false,
    durationMs: 10,
    id: 1,
    inputTokens: 0,
    isStream: false,
    method: "POST",
    model: "test-model",
    ok: true,
    outputTokens: 0,
    path: "/v1/messages",
    provider: "test-provider",
    reasoningTokens: 0,
    requestBody: { encoding: "utf8", text: "" },
    requestHeaders: {},
    requestId: "req_test",
    retryAttempts: [],
    responseHeaders: {},
    statusCode: 200,
    totalTokens: 0,
    url: "https://example.test/v1/messages"
  };
  assert.deepEqual(
    summarizeLogSelections([
      { ...base, id: 1, inputTokens: 1100, outputTokens: 12000, cacheReadTokens: 300, reasoningTokens: 1500, costUsd: 0.02 },
      { ...base, id: 2, inputTokens: 500, outputTokens: 200, cacheWriteTokens: 128, costUsd: 0.000212 }
    ]),
    { inputTokens: 1600, outputTokens: 12200, cacheTokens: 428, thinkingTokens: 1500, costUsd: 0.020212 }
  );
  assert.deepEqual(summarizeLogSelections([]), { inputTokens: 0, outputTokens: 0, cacheTokens: 0, thinkingTokens: 0, costUsd: 0 });
});

test("applyLogSelection implements single, toggle, and range selection", () => {
  const rows = [1, 2, 3, 4, 5].map((id) => ({ id }) as RequestLogEntry);
  const selected = (ids: number[]) => new Set(ids);

  // 普通单击：替换为单选，并更新锚点
  assert.deepEqual(applyLogSelection(selected([1, 2]), rows, 1, 4, "single"), { next: selected([4]), anchor: 4 });
  // Ctrl/Cmd+单击：增删单行，锚点更新
  assert.deepEqual(applyLogSelection(selected([1, 3]), rows, 3, 2, "toggle"), { next: selected([1, 2, 3]), anchor: 2 });
  assert.deepEqual(applyLogSelection(selected([1, 2, 3]), rows, 2, 2, "toggle"), { next: selected([1, 3]), anchor: 2 });
  // Shift+单击：锚点到当前行连续多选，锚点保持不变
  assert.deepEqual(applyLogSelection(selected([1]), rows, 1, 4, "range"), { next: selected([1, 2, 3, 4]), anchor: 1 });
  // 反向范围选择
  assert.deepEqual(applyLogSelection(selected([1, 5]), rows, 5, 2, "range"), { next: selected([1, 2, 3, 4, 5]), anchor: 5 });
  // 无锚点时 range 退化为单选
  assert.deepEqual(applyLogSelection(selected([1, 2]), rows, undefined, 3, "range"), { next: selected([3]), anchor: 3 });
});

test("request log model summaries stay stable without list body text", () => {


  const entry: RequestLogEntry = {
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    client: "test",
    createdAt: "2026-07-20T00:00:00.000Z",
    credentialChain: [],
    credentialSaturated: false,
    durationMs: 10,
    id: 1,
    inputTokens: 0,
    isStream: true,
    method: "POST",
    model: "legacy-model",
    ok: true,
    outputTokens: 0,
    path: "/v1/messages",
    provider: "test-provider",
    reasoningTokens: 0,
    requestedModel: "request-model",
    requestBody: { encoding: "utf8", sizeBytes: 128, text: "", truncated: false },
    requestHeaders: {},
    requestId: "req_models",
    resolvedModel: "resolved-model",
    responseHeaders: {},
    responseModel: "response-model",
    retryAttempts: [],
    statusCode: 200,
    totalTokens: 0,
    url: "https://example.test/v1/messages"
  };

  assert.equal(logRequestModel(entry), "request-model");
  assert.equal(logResponseModel(entry), "response-model");
  assert.equal(logResponseModel({ ...entry, responseModel: "" }), "resolved-model");
});
