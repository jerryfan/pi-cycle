import type { Api, Model } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import {
	Container,
	Key,
	SelectList,
	Spacer,
	Text,
	type KeyId,
	type SelectItem,
} from "@mariozechner/pi-tui";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

type CycleProfile = {
	name: string;
	provider: string;
	model: string;
	thinkingLevel: ThinkingLevel;
	/** Optional 1-sentence UX hint (what this mode is good for). */
	blurb?: string;
};

type LowContextPolicy = {
	enabled: boolean;
	/** If remaining context (100 - ctx.getContextUsage().percent) is <= this, cap thinking. */
	thresholdRemainingPercent: number;
	/** Maximum thinking level allowed when low-context policy triggers. */
	capThinkingLevel: ThinkingLevel;
};

type CycleConfigV1 = {
	version: 1;
	/** KeyId string like "ctrl+shift+f8" */
	hotkey?: KeyId;
	/** Optional adaptive thinking when context is nearly full (not provider quota). */
	lowContext?: LowContextPolicy;
	active?: string;
	profiles: CycleProfile[];
};

const CONFIG_PATH = join(homedir(), ".pi", "agent", "pi-cycle.json");
const LEGACY_CONFIG_PATH = join(homedir(), ".pi", "agent", "py-cycle.json");

const DEFAULT_HOTKEY: KeyId = Key.f8;

const HOTKEY_CHOICES: { key: KeyId; label: string }[] = [
	{ key: Key.f8, label: "F8" },
	{ key: Key.f9, label: "F9" },
	{ key: Key.ctrlShift("f8"), label: "Ctrl+Shift+F8" },
	{ key: Key.ctrlAlt("f8"), label: "Ctrl+Alt+F8" },
];

const DEFAULT_CONFIG: CycleConfigV1 = {
	version: 1,
	hotkey: DEFAULT_HOTKEY,
	lowContext: { enabled: true, thresholdRemainingPercent: 10, capThinkingLevel: "low" },
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

function isThinkingLevel(x: unknown): x is ThinkingLevel {
	return (
		x === "off" ||
		x === "minimal" ||
		x === "low" ||
		x === "medium" ||
		x === "high" ||
		x === "xhigh"
	);
}

function sanitizeProfile(p: any): CycleProfile | null {
	if (!p || typeof p !== "object") return null;
	if (typeof p.name !== "string" || !p.name.trim()) return null;
	if (typeof p.provider !== "string" || !p.provider.trim()) return null;
	if (typeof p.model !== "string" || !p.model.trim()) return null;
	if (!isThinkingLevel(p.thinkingLevel)) return null;
	const blurb = typeof p.blurb === "string" ? p.blurb.trim() : undefined;
	return {
		name: p.name.trim(),
		provider: p.provider.trim(),
		model: p.model.trim(),
		thinkingLevel: p.thinkingLevel,
		blurb: blurb && blurb.length > 0 ? blurb : undefined,
	};
}

function sanitizeHotkey(x: unknown): KeyId | undefined {
	if (typeof x !== "string") return undefined;
	if (HOTKEY_CHOICES.some((c) => c.key === x)) return x as KeyId;
	return undefined;
}

function sanitizeLowContextPolicy(x: unknown): LowContextPolicy | undefined {
	if (!x || typeof x !== "object") return undefined;
	const o = x as any;
	const enabled = typeof o.enabled === "boolean" ? o.enabled : false;
	const thresholdRemainingPercent =
		typeof o.thresholdRemainingPercent === "number" && Number.isFinite(o.thresholdRemainingPercent)
			? Math.max(0, Math.min(100, Math.round(o.thresholdRemainingPercent)))
			: 10;
	const capThinkingLevel: ThinkingLevel = isThinkingLevel(o.capThinkingLevel) ? o.capThinkingLevel : "low";
	return { enabled, thresholdRemainingPercent, capThinkingLevel };
}

function readPiSettingsModels(cwd: string): string[] | undefined {
	const globalSettingsPath = join(homedir(), ".pi", "agent", "settings.json");
	const projectSettingsPath = join(cwd, ".pi", "settings.json");

	const readSettings = (p: string): any | undefined => {
		if (!existsSync(p)) return undefined;
		try {
			return JSON.parse(readFileSync(p, "utf-8"));
		} catch {
			return undefined;
		}
	};

	const global = readSettings(globalSettingsPath);
	const project = readSettings(projectSettingsPath);
	const enabled = (project?.enabledModels ?? global?.enabledModels) as unknown;
	if (!Array.isArray(enabled)) return undefined;
	const out = enabled.filter((m) => typeof m === "string") as string[];
	return out.length > 0 ? out : undefined;
}

function buildDefaultConfig(ctx: ExtensionContext): CycleConfigV1 {
	// Prefer the user’s cached/curated enabled models from pi settings.
	const enabledModels = readPiSettingsModels(ctx.cwd);
	const available = ctx.modelRegistry.getAvailable().map((m) => `${m.provider}/${m.id}`);
	const preferred = (enabledModels ?? available).filter((x) => x.toLowerCase().includes("openai"));

	const parsed = preferred
		.map((s) => {
			const [provider, ...rest] = s.split("/");
			return { provider, model: rest.join("/") };
		})
		.filter((x) => !!x.provider && !!x.model);

	const pick = (pred: (m: { provider: string; model: string }) => boolean) => parsed.find(pred);
	const pickModel = (...preds: Array<(m: { provider: string; model: string }) => boolean>) => {
		for (const p of preds) {
			const hit = pick(p);
			if (hit) return hit;
		}
		return parsed[0];
	};
	const pickStrictModel = (...preds: Array<(m: { provider: string; model: string }) => boolean>) => {
		for (const p of preds) {
			const hit = pick(p);
			if (hit) return hit;
		}
		return undefined;
	};
	const has = (m: { model: string }, needle: string) => m.model.toLowerCase().includes(needle);
	const nonMini = (m: { model: string }) => !has(m, "mini");

	// Presets optimize the workflow role, not model branding. GPT-5.5 is the
	// current default family; older Codex/5.2 lines remain fallback-only, and
	// mini is deliberately excluded from value because output-token efficiency matters there.
	const deep = pickModel(
		(m) => has(m, "gpt-5.5"),
		(m) => has(m, "gpt-5.4") && nonMini(m),
		(m) => has(m, "gpt-5.3") && nonMini(m),
		(m) => has(m, "gpt-5.2"),
	);
	const code = pickModel(
		(m) => has(m, "gpt-5.5"),
		(m) => has(m, "gpt-5.3-codex") && nonMini(m),
		(m) => has(m, "codex") && !has(m, "spark") && nonMini(m),
		(m) => has(m, "gpt-5.4") && nonMini(m),
		(m) => has(m, "gpt-5.2"),
	);
	const general = pickModel(
		(m) => has(m, "gpt-5.5"),
		(m) => has(m, "gpt-5.4") && nonMini(m),
		(m) => has(m, "gpt-5.3") && !has(m, "spark") && nonMini(m),
		(m) => has(m, "gpt-5.2"),
	);
	const fast = pickModel(
		(m) => has(m, "gpt-5.5"),
		(m) => has(m, "gpt-5.4") && nonMini(m),
		(m) => has(m, "gpt-5.2"),
		(m) => has(m, "spark"),
		(m) => has(m, "mini"),
	);
	const value = pickStrictModel(
		(m) => has(m, "gpt-5.5"),
		(m) => has(m, "gpt-5.2"),
		(m) => has(m, "gpt-5.4") && nonMini(m),
		(m) => has(m, "gpt-5.3") && !has(m, "spark") && nonMini(m),
		(m) => has(m, "codex") && !has(m, "spark") && nonMini(m),
	);

	const mkThinking = (provider: string, model: string, desired: ThinkingLevel): ThinkingLevel => {
		const found = ctx.modelRegistry.find(provider, model);
		if (!found?.reasoning) return "off";
		return desired;
	};

	const deepThinking = deep ? mkThinking(deep.provider, deep.model, "xhigh") : "xhigh";
	const codeThinking = code ? mkThinking(code.provider, code.model, "high") : "high";
	const generalThinking = general ? mkThinking(general.provider, general.model, "medium") : "medium";
	const fastThinking = fast ? mkThinking(fast.provider, fast.model, "low") : "low";
	const valueThinking = value ? mkThinking(value.provider, value.model, "low") : "low";

	const profiles: CycleProfile[] = [];
	if (deep)
		profiles.push({
			name: "deep",
			provider: deep.provider,
			model: deep.model,
			thinkingLevel: deepThinking,
			blurb: defaultBlurb("deep"),
		});
	if (code)
		profiles.push({
			name: "code",
			provider: code.provider,
			model: code.model,
			thinkingLevel: codeThinking,
			blurb: defaultBlurb("code"),
		});
	if (general)
		profiles.push({
			name: "general",
			provider: general.provider,
			model: general.model,
			thinkingLevel: generalThinking,
			blurb: defaultBlurb("general"),
		});
	if (fast)
		profiles.push({
			name: "fast",
			provider: fast.provider,
			model: fast.model,
			thinkingLevel: fastThinking,
			blurb: defaultBlurb("fast"),
		});
	if (value)
		profiles.push({
			name: "value",
			provider: value.provider,
			model: value.model,
			thinkingLevel: valueThinking,
			blurb: defaultBlurb("value"),
		});

	const defaultProfiles = profiles.length > 0 ? profiles : structuredClone(DEFAULT_CONFIG.profiles);

	return {
		version: 1,
		hotkey: DEFAULT_HOTKEY,
		lowContext: { enabled: true, thresholdRemainingPercent: 10, capThinkingLevel: "low" },
		active: defaultProfiles.some((p) => p.name === "general") ? "general" : defaultProfiles[0]?.name,
		profiles: defaultProfiles,
	};
}

function resolveConfigReadPath(): string | undefined {
	if (existsSync(CONFIG_PATH)) return CONFIG_PATH;
	if (existsSync(LEGACY_CONFIG_PATH)) return LEGACY_CONFIG_PATH;
	return undefined;
}

function readConfigFile(ctx?: ExtensionContext): CycleConfigV1 {
	const fallback = ctx ? buildDefaultConfig(ctx) : structuredClone(DEFAULT_CONFIG);
	try {
		const p = resolveConfigReadPath();
		if (!p) return fallback;
		const raw = JSON.parse(readFileSync(p, "utf-8")) as any;
		if (raw?.version !== 1 || !Array.isArray(raw?.profiles)) return fallback;

		const profiles = raw.profiles.map(sanitizeProfile).filter(Boolean) as CycleProfile[];
		if (profiles.length === 0) return fallback;

		const active = typeof raw.active === "string" ? raw.active : undefined;
		const hotkey = sanitizeHotkey(raw.hotkey) ?? fallback.hotkey;
		const lowContext = sanitizeLowContextPolicy(raw.lowContext) ?? fallback.lowContext;
		return {
			version: 1,
			hotkey,
			lowContext,
			active,
			profiles,
		};
	} catch {
		return fallback;
	}
}

function writeConfigFile(cfg: CycleConfigV1): { ok: true } | { ok: false; error: string } {
	try {
		mkdirSync(dirname(CONFIG_PATH), { recursive: true });
		writeFileSync(CONFIG_PATH, `${JSON.stringify(cfg, null, 2)}\n`, "utf-8");
		return { ok: true };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

function defaultBlurb(name: string): string {
	switch (name.toLowerCase()) {
		case "deep":
			return "Best for specs, architecture, hard debugging, and high-stakes review.";
		case "code":
			return "Best for implementation, debugging, refactors, and code review.";
		case "daily":
		case "general":
			return "Best default: strong reasoning quality with good cost and token balance.";
		case "spark":
			return "Best for fast coding-oriented work when you want speed.";
		case "fast":
			return "Best for quick iterations, small edits, and routine questions.";
		case "value":
			return "Best cheap-reasoning default; preferred over older GPT-5.x and mini variants.";
		default:
			return "";
	}
}

function buildProfileDesc(p: CycleProfile): string {
	const b = p.blurb ?? defaultBlurb(p.name);
	return b
		? `${p.provider}/${p.model} | thinking:${p.thinkingLevel} | ${b}`
		: `${p.provider}/${p.model} | thinking:${p.thinkingLevel}`;
}

function isOpenAIProviderName(provider: string): boolean {
	return provider.toLowerCase().includes("openai");
}

function formatTokenCount(count: number): string {
	if (count >= 1_000_000) return `${Math.round(count / 100_000) / 10}M`;
	if (count >= 1_000) return `${Math.round(count / 100) / 10}K`;
	return String(count);
}

export default function piCycle(pi: ExtensionAPI) {
	let config: CycleConfigV1 = readConfigFile();
	let activeName: string | undefined = config.active;

	async function applyProfile(profile: CycleProfile, ctx: ExtensionContext): Promise<boolean> {
		config = readConfigFile(ctx);
		activeName = config.active;


		const model = ctx.modelRegistry.find(profile.provider, profile.model);
		if (!model) {
			ctx.ui.notify(`pi-cycle: model not found: ${profile.provider}/${profile.model}`, "warning");
			return false;
		}

		let ok = false;
		try {
			ok = await pi.setModel(model);
		} catch (e) {
			ctx.ui.notify(
				`pi-cycle: failed to activate model ${profile.provider}/${profile.model}: ${e instanceof Error ? e.message : String(e)}`,
				"warning",
			);
			return false;
		}

		if (!ok) {
			ctx.ui.notify(`pi-cycle: model not usable/auth failed: ${profile.provider}/${profile.model}`, "warning");
			return false;
		}

		// Adaptive thinking: cap thinking when context window is nearly full.
		// Note: this is based on context usage, not provider quota.
		let thinkingToApply: ThinkingLevel = profile.thinkingLevel;
		const policy = config.lowContext;
		const usage = ctx.getContextUsage();
		if (policy?.enabled && usage?.percent != null) {
			const remaining = 100 - usage.percent;
			if (remaining <= policy.thresholdRemainingPercent) {
				const rank: Record<ThinkingLevel, number> = {
					off: 0,
					minimal: 1,
					low: 2,
					medium: 3,
					high: 4,
					xhigh: 5,
				};
				if (rank[thinkingToApply] > rank[policy.capThinkingLevel]) {
					thinkingToApply = policy.capThinkingLevel;
				}
			}
		}

		pi.setThinkingLevel(thinkingToApply);

		activeName = profile.name;
		config.active = activeName;
		const writeRes = writeConfigFile(config);
		if (!writeRes.ok) {
			ctx.ui.notify(`pi-cycle: failed to persist active profile: ${writeRes.error}`, "warning");
		}

		const blurb = profile.blurb ?? defaultBlurb(profile.name);
		const remaining = usage?.percent == null ? undefined : Math.max(0, Math.min(100, Math.round(100 - usage.percent)));
		const capped = thinkingToApply !== profile.thinkingLevel;
		const suffix = capped
			? ` (low context: ${remaining ?? "?"}% remaining, thinking capped to ${thinkingToApply})`
			: "";
		ctx.ui.notify(
			blurb ? `Mode: ${profile.name} — ${blurb}${suffix}` : `Mode: ${profile.name}${suffix}`,
			"info",
		);
		return true;
	}

	async function cycleNext(ctx: ExtensionContext): Promise<void> {
		config = readConfigFile(ctx);
		activeName = config.active;

		const profiles = config.profiles;
		if (profiles.length === 0) {
			ctx.ui.notify("pi-cycle: no profiles configured", "warning");
			return;
		}

		const current = config.active ?? activeName;
		const idx = profiles.findIndex((p) => p.name === current);
		const start = idx < 0 ? 0 : (idx + 1) % profiles.length;

		for (let i = 0; i < profiles.length; i++) {
			const p = profiles[(start + i) % profiles.length]!;
			const ok = await applyProfile(p, ctx);
			if (ok) return;
		}

		ctx.ui.notify("pi-cycle: no usable profiles (check auth/models)", "warning");
	}

	async function pickProfile(ctx: ExtensionContext): Promise<void> {
		if (!ctx.hasUI) {
			ctx.ui.notify("pi-cycle: /cycle pick requires interactive UI", "warning");
			return;
		}

		config = readConfigFile(ctx);
		activeName = config.active;
		const profiles = config.profiles;
		if (profiles.length === 0) {
			ctx.ui.notify("pi-cycle: no profiles configured", "warning");
			return;
		}

		const items: SelectItem[] = profiles.map((p) => ({
			value: p.name,
			label: p.name === activeName ? `${p.name} (active)` : p.name,
			description: buildProfileDesc(p),
		}));

		const selected = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
			const c = new Container();
			c.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
			c.addChild(new Text(theme.fg("accent", theme.bold("pi-cycle")), 1, 0));
			c.addChild(new Text(theme.fg("muted", "Pick profile"), 1, 0));
			c.addChild(new Spacer(1));

			const list = new SelectList(items, Math.min(10, items.length), {
				selectedPrefix: (t) => theme.fg("accent", t),
				selectedText: (t) => theme.fg("accent", t),
				description: (t) => theme.fg("muted", t),
				scrollInfo: (t) => theme.fg("dim", t),
				noMatch: (t) => theme.fg("warning", t),
			});
			list.onSelect = (item) => done(String(item.value));
			list.onCancel = () => done(null);
			c.addChild(list);

			c.addChild(new Spacer(1));
			c.addChild(new Text(theme.fg("dim", "↑↓ navigate • enter select • esc cancel"), 1, 0));
			c.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

			return {
				render: (w: number) => c.render(w),
				invalidate: () => c.invalidate(),
				handleInput: (data: string) => {
					list.handleInput?.(data);
					tui.requestRender();
				},
			};
		});

		if (!selected) return;
		const p = profiles.find((x) => x.name === selected);
		if (!p) return;
		const ok = await applyProfile(p, ctx);
		if (!ok) {
			ctx.ui.notify(`pi-cycle: failed to activate profile: ${p.name}`, "warning");
		}
	}

	async function wizardPickModel(ctx: ExtensionContext): Promise<Model<Api> | undefined> {
		// Prefer the user’s cached enabled models from pi settings (more reliable than “available”).
		const enabled = readPiSettingsModels(ctx.cwd);
		const enabledSet = enabled ? new Set(enabled) : undefined;

		const models = ctx.modelRegistry
			.getAvailable()
			.filter((m) => isOpenAIProviderName(m.provider))
			.filter((m) => (enabledSet ? enabledSet.has(`${m.provider}/${m.id}`) : true))
			.sort((a, b) => {
				const pc = a.provider.localeCompare(b.provider);
				return pc !== 0 ? pc : a.id.localeCompare(b.id);
			});

		if (models.length === 0) {
			ctx.ui.notify("pi-cycle: no OpenAI models available (check auth / providers)", "warning");
			return;
		}

		const options = models.map((m) => {
			const images = m.input.includes("image") ? "img" : "text";
			const thinking = m.reasoning ? "think" : "no-think";
			return {
				value: `${m.provider}/${m.id}`,
				label: `${m.provider}/${m.id}`,
				description: `ctx ${formatTokenCount(m.contextWindow)} • out ${formatTokenCount(m.maxTokens)} • ${thinking} • ${images}`,
			};
		});

		const pick = await ctx.ui.select("Pick model:", options.map((o) => o.value));
		if (!pick) return;

		const [provider, ...rest] = pick.split("/");
		const id = rest.join("/");
		return ctx.modelRegistry.find(provider, id);
	}

	async function wizardPickThinking(ctx: ExtensionContext, model: Model<Api>): Promise<ThinkingLevel | undefined> {
		const options: ThinkingLevel[] = model.reasoning
			? ["minimal", "low", "medium", "high", "xhigh", "off"]
			: ["off"];
		const v = await ctx.ui.select("Pick thinking level:", options);
		if (!v) return;
		return v as ThinkingLevel;
	}

	async function configMenu(ctx: ExtensionCommandContext): Promise<void> {
		if (!ctx.hasUI) {
			ctx.ui.notify("pi-cycle: /cycle config requires interactive UI", "warning");
			return;
		}

		config = readConfigFile(ctx);
		activeName = config.active;

		type Action =
			| "add"
			| "edit"
			| "remove"
			| "move-up"
			| "move-down"
			| "hotkey"
			| "low-context"
			| "reset"
			| "edit-json"
			| "reload"
			| "back";

		const action = await ctx.ui.select("pi-cycle config:", [
			"add",
			"edit",
			"remove",
			"move-up",
			"move-down",
			"hotkey",
			"low-context",
			"reset",
			"edit-json",
			"reload",
			"back",
		] as Action[]);

		if (!action || action === "back") return;

		if (action === "reload") {
			config = readConfigFile(ctx);
			activeName = config.active;
			ctx.ui.notify(`pi-cycle: reloaded ${resolveConfigReadPath() ?? CONFIG_PATH}`, "info");
			return;
		}

		if (action === "reset") {
			const ok = await ctx.ui.confirm("Reset to defaults?", "This overwrites your pi-cycle config.");
			if (!ok) return;
			config = buildDefaultConfig(ctx);
			activeName = config.active;
			const res = writeConfigFile(config);
			if (!res.ok) ctx.ui.notify(`pi-cycle: failed to write config: ${res.error}`, "error");
			else ctx.ui.notify("pi-cycle: reset to defaults", "info");
			return;
		}

		if (action === "edit-json") {
			const edited = await ctx.ui.editor("Edit pi-cycle.json:", `${JSON.stringify(config, null, 2)}\n`);
			if (edited === undefined) return;
			try {
				const parsed = JSON.parse(edited) as any;
				const next: CycleConfigV1 = {
					version: 1,
					hotkey: sanitizeHotkey(parsed.hotkey) ?? config.hotkey,
					lowContext: sanitizeLowContextPolicy(parsed.lowContext) ?? config.lowContext,
					active: typeof parsed.active === "string" ? parsed.active : undefined,
					profiles: Array.isArray(parsed.profiles)
						? (parsed.profiles.map(sanitizeProfile).filter(Boolean) as CycleProfile[])
						: [],
				};
				if (next.profiles.length === 0) {
					ctx.ui.notify("pi-cycle: invalid config (profiles empty)", "error");
					return;
				}
				config = next;
				activeName = config.active;
				const res = writeConfigFile(config);
				if (!res.ok) ctx.ui.notify(`pi-cycle: failed to write config: ${res.error}`, "error");
				else ctx.ui.notify(`pi-cycle: saved ${CONFIG_PATH}`, "info");
			} catch (e) {
				ctx.ui.notify(`pi-cycle: JSON parse error: ${e instanceof Error ? e.message : String(e)}`, "error");
			}
			return;
		}

		// Profile selection helper
		const pickName = async (title: string): Promise<string | undefined> => {
			config = readConfigFile(ctx);
			const names = config.profiles.map((p) => p.name);
			const v = await ctx.ui.select(title, names);
			return v;
		};

		if (action === "hotkey") {
			const selected = await ctx.ui.select(
				"Pick cycle hotkey (reload will be offered):",
				HOTKEY_CHOICES.map((c) => c.key),
			);
			if (!selected) return;
			config.hotkey = selected as KeyId;
			const res = writeConfigFile(config);
			if (!res.ok) {
				ctx.ui.notify(`pi-cycle: failed to write config: ${res.error}`, "error");
				return;
			}
			ctx.ui.notify(`pi-cycle: saved hotkey: ${selected}`, "info");
			const doReload = await ctx.ui.confirm("Reload now?", "Reload is required to apply the new hotkey binding.");
			if (doReload) await ctx.reload();
			return;
		}

		if (action === "low-context") {
			const enabled = await ctx.ui.confirm(
				"Low-context thinking cap",
				"When context remaining is low (e.g. <= 10%), cap thinking to reduce long internal reasoning near the limit.",
			);
			const thresholdRaw = await ctx.ui.input("Threshold (remaining %):", "10");
			const threshold = thresholdRaw ? Math.max(0, Math.min(100, parseInt(thresholdRaw, 10))) : 10;
			const cap = await ctx.ui.select("Cap thinking level to:", ["off", "minimal", "low", "medium", "high", "xhigh"]);
			if (!cap) return;
			config.lowContext = {
				enabled,
				thresholdRemainingPercent: Number.isFinite(threshold) ? threshold : 10,
				capThinkingLevel: cap as ThinkingLevel,
			};
			const res = writeConfigFile(config);
			if (!res.ok) ctx.ui.notify(`pi-cycle: failed to write config: ${res.error}`, "error");
			else ctx.ui.notify(`pi-cycle: low-context cap ${enabled ? "enabled" : "disabled"} (<=${config.lowContext.thresholdRemainingPercent}%)`, "info");
			return;
		}

		if (action === "add") {
			const name = await ctx.ui.input("Profile name:", "e.g. deep");
			if (!name?.trim()) return;
			const n = name.trim();
			if (config.profiles.some((p) => p.name === n)) {
				ctx.ui.notify(`pi-cycle: profile already exists: ${n}`, "error");
				return;
			}

			const m = await wizardPickModel(ctx);
			if (!m) return;
			const thinking = await wizardPickThinking(ctx, m);
			if (!thinking) return;

			const blurb = await ctx.ui.input("One-sentence purpose (optional):", "e.g. Best for quick iterations and small edits.");
			const b = blurb?.trim();

			config.profiles.push({
				name: n,
				provider: m.provider,
				model: m.id,
				thinkingLevel: thinking,
				blurb: b && b.length > 0 ? b : undefined,
			});
			const res = writeConfigFile(config);
			if (!res.ok) ctx.ui.notify(`pi-cycle: failed to write config: ${res.error}`, "error");
			else ctx.ui.notify(`pi-cycle: added ${n}`, "info");
			return;
		}

		if (action === "remove") {
			const n = await pickName("Remove which profile?");
			if (!n) return;
			config.profiles = config.profiles.filter((p) => p.name !== n);
			if (config.active === n) config.active = config.profiles[0]?.name;
			const res = writeConfigFile(config);
			if (!res.ok) ctx.ui.notify(`pi-cycle: failed to write config: ${res.error}`, "error");
			else ctx.ui.notify(`pi-cycle: removed ${n}`, "info");
			return;
		}

		if (action === "move-up" || action === "move-down") {
			const n = await pickName(action === "move-up" ? "Move up which profile?" : "Move down which profile?");
			if (!n) return;
			const i = config.profiles.findIndex((p) => p.name === n);
			if (i < 0) return;
			const j = action === "move-up" ? i - 1 : i + 1;
			if (j < 0 || j >= config.profiles.length) return;
			const tmp = config.profiles[i];
			config.profiles[i] = config.profiles[j];
			config.profiles[j] = tmp;
			const res = writeConfigFile(config);
			if (!res.ok) ctx.ui.notify(`pi-cycle: failed to write config: ${res.error}`, "error");
			else ctx.ui.notify(`pi-cycle: moved ${n}`, "info");
			return;
		}

		if (action === "edit") {
			const n = await pickName("Edit which profile?");
			if (!n) return;
			const i = config.profiles.findIndex((p) => p.name === n);
			if (i < 0) return;

			const current = config.profiles[i]!;
			const m = await wizardPickModel(ctx);
			if (!m) return;
			const thinking = await wizardPickThinking(ctx, m);
			if (!thinking) return;

			const blurb = await ctx.ui.input(
				"Update purpose blurb (optional):",
				"Leave empty to keep current; enter a sentence like: Best for quick iterations and small edits.",
			);
			const b = blurb?.trim();

			config.profiles[i] = {
				...current,
				provider: m.provider,
				model: m.id,
				thinkingLevel: thinking,
				blurb: b === undefined ? current.blurb : b.length > 0 ? b : undefined,
			};
			const res = writeConfigFile(config);
			if (!res.ok) ctx.ui.notify(`pi-cycle: failed to write config: ${res.error}`, "error");
			else ctx.ui.notify(`pi-cycle: updated ${n}`, "info");
			return;
		}
	}

	async function doctor(ctx: ExtensionContext): Promise<void> {
		config = readConfigFile(ctx);
		activeName = config.active;

		const issues: string[] = [];
		const notes: string[] = [];

		const readPath = resolveConfigReadPath();
		if (!readPath) notes.push("config: (missing) -> defaults");
		else if (readPath === LEGACY_CONFIG_PATH)
			notes.push(`config: ${readPath} (legacy; will write to ${CONFIG_PATH} on save)`);
		else notes.push(`config: ${readPath}`);

		const hotkeyLabel =
			(HOTKEY_CHOICES.find((c) => c.key === (config.hotkey ?? DEFAULT_HOTKEY))?.label) ??
			(config.hotkey ?? DEFAULT_HOTKEY);
		notes.push(`hotkey: ${hotkeyLabel}`);

		if (config.lowContext) {
			notes.push(
				`low-context cap: ${config.lowContext.enabled ? "enabled" : "disabled"} (<=${config.lowContext.thresholdRemainingPercent}% -> cap ${config.lowContext.capThinkingLevel})`,
			);
		}

		if (config.active && !config.profiles.some((p) => p.name === config.active)) {
			issues.push(`active profile not found in profiles: "${config.active}"`);
		}

		const seen = new Set<string>();
		for (const p of config.profiles) {
			if (seen.has(p.name)) issues.push(`duplicate profile name: "${p.name}"`);
			seen.add(p.name);

			const m = ctx.modelRegistry.find(p.provider, p.model);
			if (!m) {
				issues.push(`model not found: ${p.provider}/${p.model} (profile "${p.name}")`);
				continue;
			}
			if (!m.reasoning && p.thinkingLevel !== "off") {
				issues.push(
					`model has no thinking support but profile sets thinking:${p.thinkingLevel}: ${p.provider}/${p.model} (profile "${p.name}")`,
				);
			}
		}

		const header = "pi-cycle doctor";
		const summary = issues.length === 0 ? "OK" : `${issues.length} issue(s)`;
		const report =
			`${header}\n` +
			`Status: ${summary}\n\n` +
			(notes.length ? `Notes:\n- ${notes.join("\n- ")}\n\n` : "") +
			(issues.length
				? `Issues:\n- ${issues.join("\n- ")}\n\n`
				: "Issues: (none)\n\n") +
			"Tips:\n" +
			"- If models are missing/unauthorized, run: pi --list-models openai\n" +
			"- If cycling gets stuck, remove the failing profile in /cycle config\n";

		if (ctx.hasUI) {
			await ctx.ui.editor("pi-cycle doctor report (close to exit)", report);
			return;
		}

		ctx.ui.notify(issues.length === 0 ? "pi-cycle: doctor OK" : `pi-cycle: doctor found ${issues.length} issue(s)`, issues.length === 0 ? "info" : "warning");
	}

	async function mainMenu(ctx: ExtensionCommandContext): Promise<void> {
		if (!ctx.hasUI) {
			await cycleNext(ctx);
			return;
		}

		config = readConfigFile(ctx);
		activeName = activeName ?? config.active;

		type Action = "next" | "pick" | "config" | "doctor" | "help" | "reload" | "close";
		const hotkeyLabel = (HOTKEY_CHOICES.find((c) => c.key === (config.hotkey ?? DEFAULT_HOTKEY))?.label) ??
			(config.hotkey ?? DEFAULT_HOTKEY);
		const configPathLabel = resolveConfigReadPath() ?? CONFIG_PATH;
		const items: SelectItem[] = [
			{ value: "next", label: "Cycle next", description: hotkeyLabel },
			{ value: "pick", label: "Pick profile", description: "Select a profile directly" },
			{ value: "config", label: "Configure", description: "Add/edit/remove/reorder profiles" },
			{ value: "doctor", label: "Doctor", description: "Self-check models, config, and thinking support" },
			{ value: "reload", label: "Reload config", description: configPathLabel },
			{ value: "help", label: "Help", description: "/cycle next | /cycle pick | /cycle config | /cycle doctor" },
			{ value: "close", label: "Close", description: "" },
		];

		const selected = await ctx.ui.custom<Action | null>((tui, theme, _kb, done) => {
			const c = new Container();
			c.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
			c.addChild(new Text(theme.fg("accent", theme.bold("pi-cycle")), 1, 0));
			const activeProfile = config.profiles.find((p) => p.name === activeName);
			const activeBlurb = activeProfile?.blurb ?? (activeName ? defaultBlurb(activeName) : "");
			c.addChild(
				new Text(
					theme.fg(
						"muted",
						activeName
							? activeBlurb
								? `active: ${activeName} — ${activeBlurb}`
								: `active: ${activeName}`
							: "active: (none)",
					),
					1,
					0,
				),
			);
			c.addChild(new Spacer(1));

			const list = new SelectList(items, Math.min(items.length, 9), {
				selectedPrefix: (t) => theme.fg("accent", t),
				selectedText: (t) => theme.fg("accent", t),
				description: (t) => theme.fg("muted", t),
				scrollInfo: (t) => theme.fg("dim", t),
				noMatch: (t) => theme.fg("warning", t),
			});
			list.onSelect = (item) => done(item.value as Action);
			list.onCancel = () => done(null);
			c.addChild(list);

			c.addChild(new Spacer(1));
			c.addChild(new Text(theme.fg("dim", "↑↓ navigate • enter select • esc cancel"), 1, 0));
			c.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

			return {
				render: (w: number) => c.render(w),
				invalidate: () => c.invalidate(),
				handleInput: (data: string) => {
					list.handleInput?.(data);
					tui.requestRender();
				},
			};
		});

		if (!selected || selected === "close") return;

		switch (selected) {
			case "next":
				await cycleNext(ctx);
				return;
			case "pick":
				await pickProfile(ctx);
				return;
			case "config":
				await configMenu(ctx);
				return;
			case "doctor":
				await doctor(ctx);
				return;
			case "reload":
				config = readConfigFile(ctx);
				activeName = config.active;
				ctx.ui.notify(`pi-cycle: reloaded ${resolveConfigReadPath() ?? CONFIG_PATH}`, "info");
				return;
			case "help":
				ctx.ui.notify("/cycle (menu) • /cycle next • /cycle pick • /cycle config • /cycle doctor", "info");
				return;
		}
	}

	const initialHotkey = (config.hotkey ?? DEFAULT_HOTKEY) as KeyId;
	pi.registerShortcut(initialHotkey, {
		description: "pi-cycle: cycle model+thinking profile",
		handler: async (ctx) => {
			await cycleNext(ctx);
		},
	});

	pi.registerCommand("cycle", {
		description: "Cycle model+thinking profiles (pi-cycle)",
		handler: async (args, ctx) => {
			const a = (args ?? "").trim();

			if (!ctx.hasUI && !a) {
				await cycleNext(ctx);
				return;
			}

			if (!a || a === "ui" || a === "menu") {
				if (!ctx.hasUI) {
					await cycleNext(ctx);
					return;
				}
				await mainMenu(ctx as ExtensionCommandContext);
				return;
			}

			if (a === "next") {
				await cycleNext(ctx);
				return;
			}

			if (a === "pick") {
				if (!ctx.hasUI) {
					ctx.ui.notify("pi-cycle: /cycle pick requires interactive UI", "warning");
					return;
				}
				await pickProfile(ctx);
				return;
			}

			if (a === "config") {
				if (!ctx.hasUI) {
					ctx.ui.notify("pi-cycle: /cycle config requires interactive UI", "warning");
					return;
				}
				await configMenu(ctx as ExtensionCommandContext);
				return;
			}

			if (a === "doctor") {
				await doctor(ctx);
				return;
			}

			if (a === "help" || a === "?" || a === "h") {
				ctx.ui.notify("Usage: /cycle | /cycle next | /cycle pick | /cycle config | /cycle doctor | /cycle <name>", "info");
				return;
			}

			// Direct set: /cycle <name>
			config = readConfigFile(ctx);
			activeName = config.active;
			const p = config.profiles.find((x) => x.name === a);
			if (p) {
				const ok = await applyProfile(p, ctx);
				if (!ok) ctx.ui.notify(`pi-cycle: failed to activate profile: ${p.name}`, "warning");
				return;
			}

			ctx.ui.notify("pi-cycle: unknown command. Try /cycle help", "info");
		},
	});

	pi.on("session_start", (_event, ctx) => {
		config = readConfigFile(ctx);
		activeName = config.active;
	});
}
