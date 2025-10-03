import { z } from 'zod';

export interface ScoreDetail {
  ruleId: string;
  matched: boolean;
  weight: number;
  contribution: number;
}

export interface ScoreResult {
  total: number | null;
  details: ScoreDetail[];
}

const ruleSchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1),
  operator: z.enum([
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'includes',
    'oneOf'
  ]),
  value: z.any().optional(),
  weight: z.number().finite().default(1)
});

const scoringConfigSchema = z
  .object({
    rules: z.array(ruleSchema).default([]),
    baseScore: z.number().finite().optional()
  })
  .strict()
  .partial({ baseScore: true });

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const evaluateRule = (
  rule: z.infer<typeof ruleSchema>,
  answers: Record<string, unknown>
): boolean => {
  const answer = answers[rule.questionId];
  switch (rule.operator) {
    case 'eq':
      return answer === rule.value;
    case 'neq':
      return answer !== rule.value;
    case 'gt': {
      const numericAnswer = toNumber(answer);
      const numericValue = toNumber(rule.value);
      return (
        numericAnswer !== null &&
        numericValue !== null &&
        numericAnswer > numericValue
      );
    }
    case 'gte': {
      const numericAnswer = toNumber(answer);
      const numericValue = toNumber(rule.value);
      return (
        numericAnswer !== null &&
        numericValue !== null &&
        numericAnswer >= numericValue
      );
    }
    case 'lt': {
      const numericAnswer = toNumber(answer);
      const numericValue = toNumber(rule.value);
      return (
        numericAnswer !== null &&
        numericValue !== null &&
        numericAnswer < numericValue
      );
    }
    case 'lte': {
      const numericAnswer = toNumber(answer);
      const numericValue = toNumber(rule.value);
      return (
        numericAnswer !== null &&
        numericValue !== null &&
        numericAnswer <= numericValue
      );
    }
    case 'includes':
      if (Array.isArray(answer)) {
        return answer.some((item) => item === rule.value);
      }
      if (typeof answer === 'string' && typeof rule.value === 'string') {
        return answer.toLowerCase().includes(rule.value.toLowerCase());
      }
      return false;
    case 'oneOf':
      if (Array.isArray(rule.value)) {
        return rule.value.includes(answer as never);
      }
      return false;
    default:
      return false;
  }
};

export const scoringService = {
  calculate(
    answers: Record<string, unknown>,
    rawConfig?: unknown
  ): ScoreResult {
    if (!rawConfig) {
      return { total: null, details: [] };
    }

    const parsed = scoringConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      return { total: null, details: [] };
    }

    const { rules, baseScore } = parsed.data;

    if (rules.length === 0 && typeof baseScore === 'undefined') {
      return { total: null, details: [] };
    }

    let total = baseScore ?? 0;
    const details: ScoreDetail[] = [];

    for (const rule of rules) {
      const matched = evaluateRule(rule, answers);
      const contribution = matched ? rule.weight : 0;
      total += contribution;
      details.push({
        ruleId: rule.id,
        matched,
        weight: rule.weight,
        contribution
      });
    }

    return { total, details };
  }
};
