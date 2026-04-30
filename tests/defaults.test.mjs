import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const target = {
  version: 1,
  hotkey: "f8",
  lowContext: {
    enabled: true,
    thresholdRemainingPercent: 10,
    capThinkingLevel: "low",
  },
  active: "general",
  profiles: [
    {
      name: "deep",
      provider: "openai-codex",
      model: "gpt-5.5",
      thinkingLevel: "xhigh",
      blurb: "Best for specs, architecture, hard debugging, and high-stakes review.",
    },
    {
      name: "code",
      provider: "openai-codex",
      model: "gpt-5.5",
      thinkingLevel: "high",
      blurb: "Best for implementation, debugging, refactors, and code review.",
    },
    {
      name: "general",
      provider: "openai-codex",
      model: "gpt-5.5",
      thinkingLevel: "medium",
      blurb: "Best default: strong reasoning quality with good cost and token balance.",
    },
    {
      name: "fast",
      provider: "openai-codex",
      model: "gpt-5.5",
      thinkingLevel: "low",
      blurb: "Best for quick iterations, small edits, and routine questions.",
    },
    {
      name: "value",
      provider: "openai-codex",
      model: "gpt-5.5",
      thinkingLevel: "low",
      blurb: "Best cheap-reasoning default; preferred over older GPT-5.x and mini variants.",
    },
  ],
};

const example = JSON.parse(readFileSync(new URL("../example.json", import.meta.url), "utf8"));
assert.deepEqual(example, target, "example config documents the shipped defaults exactly");

const source = readFileSync(new URL("../index.ts", import.meta.url), "utf8");

assert.match(source, /active:\s*"general"/, "default active profile remains general");
assert.match(source, /lowContext:\s*\{ enabled: true, thresholdRemainingPercent: 10, capThinkingLevel: "low" \}/, "low-context cap defaults to low");
assert.match(source, /if \(rank\[thinkingToApply\] > rank\[policy\.capThinkingLevel\]\) \{\s*thinkingToApply = policy\.capThinkingLevel;/s, "low-context policy caps thinking level");

for (const model of ["gpt-5.3-codex", "gpt-5.2", "gpt-5.4"]) {
  assert.ok(source.includes(model), `${model} remains accepted as a fallback/custom model`);
}
assert.ok(source.includes('has(m, "mini")'), "mini models, including gpt-5.4-mini, remain accepted for custom profiles/fallbacks");
assert.match(source, /const profiles = raw\.profiles\.map\(sanitizeProfile\)\.filter\(Boolean\)/, "custom user profiles are read and preserved instead of overwritten");

console.log("pi-cycle default preset tests passed");
