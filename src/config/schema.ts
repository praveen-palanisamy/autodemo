import { z } from "zod";

const ViewportSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const StepGotoSchema = z.object({
  type: z.literal("goto"),
  url: z.string().min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepActSchema = z.object({
  type: z.literal("act"),
  instruction: z.string().min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepClickSchema = z.object({
  type: z.literal("click"),
  selector: z.string().min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepFillSchema = z.object({
  type: z.literal("fill"),
  selector: z.string().min(1),
  value: z.string(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepHoverSchema = z.object({
  type: z.literal("hover"),
  selector: z.string().min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepPressSchema = z.object({
  type: z.literal("press"),
  key: z.string().min(1),
  selector: z.string().optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepSelectSchema = z.object({
  type: z.literal("select"),
  selector: z.string().min(1),
  values: z.array(z.string()).min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepWaitForSelectorSchema = z.object({
  type: z.literal("waitForSelector"),
  selector: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepWaitForTextSchema = z.object({
  type: z.literal("waitFor"),
  text: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepExpectVisibleSchema = z.object({
  type: z.literal("expectVisible"),
  selector: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepExpectTextSchema = z.object({
  type: z.literal("expectText"),
  selector: z.string().min(1),
  text: z.string().min(1),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepSleepSchema = z.object({
  type: z.literal("sleep"),
  ms: z.number().int().nonnegative(),
  capture: z.boolean().optional(),
  note: z.string().optional(),
});

const StepScrollToSchema = z.object({
  type: z.literal("scrollTo"),
  y: z.number().int().nonnegative(),
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
]);

export type ScenarioStep = z.infer<typeof ScenarioStepSchema>;

export const ScenarioSchema = z.object({
  description: z.string().optional(),
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
  }),
  llm: z
    .object({
      provider: z.enum(["openai", "anthropic", "ollama"]).default("openai"),
      model: z.string().min(1).default("gpt-4o-mini"),
      apiKeyEnv: z.string().min(1).default("OPENAI_API_KEY"),
    })
    .optional(),
  browser: z
    .object({
      headless: z.boolean().default(false),
      viewport: ViewportSchema.default({ width: 1440, height: 900 }),
      recordVideo: z.boolean().default(false),
      cursor: CursorSchema.default({}),
      transitions: TransitionsSchema.default({}),
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


