import { z } from "zod";

const ViewportSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const AssetCaptureSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "Use letters, numbers, dots, underscores, or hyphens"),
  selector: z.string().min(1).optional(),
  fullPage: z.boolean().default(false),
});

const StepGotoSchema = z.object({
  type: z.literal("goto"),
  url: z.string().min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepActSchema = z.object({
  type: z.literal("act"),
  instruction: z.string().min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepClickSchema = z.object({
  type: z.literal("click"),
  selector: z.string().min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepFillSchema = z.object({
  type: z.literal("fill"),
  selector: z.string().min(1),
  value: z.string(),
  /**
   * Type text character-by-character for product-demo videos instead of replacing it instantly.
   */
  typing: z.boolean().optional(),
  delayMs: z.number().int().nonnegative().optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepHoverSchema = z.object({
  type: z.literal("hover"),
  selector: z.string().min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepPressSchema = z.object({
  type: z.literal("press"),
  key: z.string().min(1),
  selector: z.string().optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepSelectSchema = z.object({
  type: z.literal("select"),
  selector: z.string().min(1),
  values: z.array(z.string()).min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepWaitForSelectorSchema = z.object({
  type: z.literal("waitForSelector"),
  selector: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepWaitForTextSchema = z.object({
  type: z.literal("waitFor"),
  text: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepExpectVisibleSchema = z.object({
  type: z.literal("expectVisible"),
  selector: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepExpectTextSchema = z.object({
  type: z.literal("expectText"),
  selector: z.string().min(1),
  text: z.string().min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepSleepSchema = z.object({
  type: z.literal("sleep"),
  ms: z.number().int().nonnegative(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepScrollToSchema = z.object({
  type: z.literal("scrollTo"),
  y: z.number().int().nonnegative(),
  behavior: z.enum(["auto", "smooth"]).optional(),
  durationMs: z.number().int().positive().optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepScrollIntoViewSchema = z.object({
  type: z.literal("scrollIntoView"),
  selector: z.string().min(1),
  behavior: z.enum(["auto", "smooth"]).optional(),
  block: z.enum(["start", "center", "end", "nearest"]).optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepNarrateSchema = z.object({
  type: z.literal("narrate"),
  text: z.string().min(1),
  ms: z.number().int().positive().optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
  asset: AssetCaptureSchema.optional(),
});

const StepScreenshotSchema = z.object({
  type: z.literal("screenshot"),
  name: AssetCaptureSchema.shape.name,
  selector: z.string().min(1).optional(),
  fullPage: z.boolean().default(false),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const CursorSchema = z.object({
  showCursor: z.boolean().default(true),
  style: z.enum(["arrow", "hand"]).default("arrow"),
  pointerColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#0076FF"),
  clickColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#0076FF"),
  highlightClicks: z.boolean().default(true),
  clickRadius: z.number().int().positive().default(24),
});

const TransitionsSchema = z.object({
  /**
   * Delay after each step to let UI settle and keep the cursor visible in captures.
   */
  transitionMs: z.number().int().positive().default(800),
  /**
   * Extra pause after the final step before finishing (for video tail).
   */
  endPauseMs: z.number().int().positive().default(1200),
});

const CaptureSchema = z.object({
  /**
   * Hide framework/debug overlays that are useful during development but should not
   * appear in product-demo captures. Set false when deliberately recording debug UI.
   */
  hideDevOverlays: z.boolean().default(true),
});

const VideoSchema = z.object({
  /**
   * Playwright's raw video recorder is most stable at conventional 16:9 video
   * surfaces. The final MP4 is still normalized to the configured viewport size.
   */
  recordSize: ViewportSchema.default({ width: 1280, height: 720 }),
  /**
   * Keep a small lead-in before a scenario's videoStartStep when trimming setup frames.
   */
  trimStartBeforeMs: z.number().int().nonnegative().default(600),
});

export const ScenarioStepSchema = z.discriminatedUnion("type", [
  StepGotoSchema,
  StepActSchema,
  StepClickSchema,
  StepFillSchema,
  StepHoverSchema,
  StepPressSchema,
  StepSelectSchema,
  StepWaitForSelectorSchema,
  StepWaitForTextSchema,
  StepExpectVisibleSchema,
  StepExpectTextSchema,
  StepSleepSchema,
  StepScrollToSchema,
  StepScrollIntoViewSchema,
  StepNarrateSchema,
  StepScreenshotSchema,
]);

export type ScenarioStep = z.infer<typeof ScenarioStepSchema>;

export const ScenarioSchema = z.object({
  description: z.string().optional(),
  videoStartStep: z.number().int().nonnegative().optional(),
  story: z
    .object({
      title: z.string().min(1).optional(),
      persona: z.string().min(1).optional(),
      goal: z.string().min(1).optional(),
    })
    .optional(),
  steps: z.array(ScenarioStepSchema).min(1),
});

export type ScenarioConfig = z.infer<typeof ScenarioSchema>;

export const AutoDemoConfigSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    baseUrl: z.string().url().optional(),
  }),
  output: z.object({
    dir: z.string().min(1).default("public/demos"),
    clean: z.boolean().default(true),
    /** Show a small "Made with AutoDemo" footer in generated walkthroughs. */
    branding: z.boolean().default(true),
  }),
  llm: z
    .object({
      /**
       * Provider for AI (`act`) steps. When omitted, AutoDemo auto-detects the
       * provider from well-known env vars (ANTHROPIC_API_KEY, OPENAI_API_KEY,
       * GOOGLE_API_KEY/GEMINI_API_KEY, GROQ_API_KEY, OLLAMA_HOST).
       */
      provider: z.enum(["openai", "anthropic", "google", "groq", "ollama", "custom"]).optional(),
      model: z.string().min(1).optional(),
      apiKeyEnv: z.string().min(1).optional(),
      /** OpenAI-compatible endpoint for local/self-hosted models (Ollama, vLLM, LM Studio). */
      baseUrl: z.string().url().optional(),
    })
    .optional(),
  browser: z
    .object({
      headless: z.boolean().default(false),
      viewport: ViewportSchema.default({ width: 1600, height: 900 }),
      recordVideo: z.boolean().default(false),
      cursor: CursorSchema.default({}),
      transitions: TransitionsSchema.default({}),
      capture: CaptureSchema.default({}),
      video: VideoSchema.default({}),
    })
    .default({}),
  auth: z
    .object({
      statePath: z.string().min(1).optional(),
      saveState: z.boolean().default(false),
    })
    .default({}),
  recording: z
    .object({
      // Which browser events to capture during `autodemo record --interactive`
      events: z.array(z.enum(["click", "fill", "scroll"])).default(["click", "fill"]),
      // Throttle scroll sampling (ms)
      scrollThrottleMs: z.number().int().positive().default(300),
    })
    .default({}),
  stagehand: z
    .object({
      mode: z.enum(["local", "browserbase"]).default("local"),
      browserbaseApiKeyEnv: z.string().min(1).default("BROWSERBASE_API_KEY"),
    })
    .optional(),
  scenarios: z.record(z.string().min(1), ScenarioSchema).default({}),
});

export type AutoDemoConfig = z.infer<typeof AutoDemoConfigSchema>;
