import {
  canonicalExerciseNames,
  priorityExerciseNames
} from "./exercise-name-catalog.js";
import {
  blockedExerciseNames,
  blockedExerciseWordFragments
} from "./exercise-name-blocklist.js";
import { resolveExerciseNameAlias } from "./exercise-name-aliases.js";
import {
  boundedExerciseNameDistance,
  exerciseNameLookup,
  normalizeExerciseName
} from "./exercise-name-normalization.js";

export interface ExerciseNameQualityIssue {
  code:
    | "contains_date"
    | "contains_export_noise"
    | "contains_url_or_email"
    | "looks_numeric"
    | "blocked_term"
    | "not_in_catalog";
  message: string;
}

export interface ExerciseNameEvaluation {
  status: "accepted" | "warn" | "blocked";
  normalizedName: string;
  reasons: ExerciseNameQualityIssue[];
  suggestions: string[];
}

const normalizedCatalog = canonicalExerciseNames.map((name) => ({
  canonicalName: name,
  lookupName: exerciseNameLookup(name),
  priority: (priorityExerciseNames as readonly string[]).includes(name)
}));

const blockedNames = new Set(blockedExerciseNames.map((name) => exerciseNameLookup(name)));
const blockedWordPatterns = blockedExerciseWordFragments.map(
  (fragment) => new RegExp(`\\b${escapeRegExp(fragment)}\\b`, "i")
);
const knownNames = new Set(normalizedCatalog.map((item) => item.lookupName));
const datePattern =
  /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{8})\b/;
const timestampPattern = /\b\d{4}-\d{2}-\d{2}t\d{2}:\d{2}(?::\d{2})?/i;
const urlOrEmailPattern = /https?:\/\/|www\.|[^\s]+@[^\s]+\.[^\s]+/i;
const exportNoisePattern = /\b(?:csv|import|export|sheet|copy|backup|log|entry)\b/i;
const rowMarkerPattern = /\brow\s+\d{4,}\b/i;
const longNumericSuffixPattern = /(?:^|\s)\d{5,}(?:\s|$)/;
const MAX_SUGGESTION_DISTANCE = 6;

export function evaluateExerciseName(name: string): ExerciseNameEvaluation {
  const normalizedName = normalizeExerciseName(name);
  const normalizedLookup = exerciseNameLookup(normalizedName);
  const blockedReasons = blockedReasonMatches(normalizedName, normalizedLookup);

  if (blockedReasons.length > 0) {
    return {
      status: "blocked",
      normalizedName,
      reasons: blockedReasons,
      suggestions: findSuggestions(normalizedName)
    };
  }

  if (knownNames.has(normalizedLookup)) {
    return {
      status: "accepted",
      normalizedName,
      reasons: [],
      suggestions: []
    };
  }

  return {
    status: "warn",
    normalizedName,
    reasons: [
      {
        code: "not_in_catalog",
        message: "This name is not in the approved exercise catalog yet."
      }
    ],
    suggestions: findSuggestions(normalizedName)
  };
}

function blockedReasonMatches(
  normalizedName: string,
  normalizedLookup: string
): ExerciseNameQualityIssue[] {
  const reasons: ExerciseNameQualityIssue[] = [];

  if (blockedNames.has(normalizedLookup)) {
    reasons.push({
      code: "blocked_term",
      message: "This looks like a placeholder or test value, not an exercise name."
    });
  }

  if (blockedWordPatterns.some((pattern) => pattern.test(normalizedName))) {
    reasons.push({
      code: "blocked_term",
      message: "Exercise names must not include troll words, slurs, or offensive language."
    });
  }

  if (datePattern.test(normalizedName) || timestampPattern.test(normalizedName)) {
    reasons.push({
      code: "contains_date",
      message: "Exercise names must not include dates or timestamps."
    });
  }

  if (urlOrEmailPattern.test(normalizedName)) {
    reasons.push({
      code: "contains_url_or_email",
      message: "Exercise names must not include URLs or email addresses."
    });
  }

  if (exportNoisePattern.test(normalizedName) || rowMarkerPattern.test(normalizedName)) {
    reasons.push({
      code: "contains_export_noise",
      message: "Exercise names must not include import/export labels or row markers."
    });
  }

  if (looksNumeric(normalizedName)) {
    reasons.push({
      code: "looks_numeric",
      message: "Exercise names must not be mostly numeric or include long numeric IDs."
    });
  }

  return reasons;
}

function looksNumeric(name: string): boolean {
  if (longNumericSuffixPattern.test(name)) {
    return true;
  }

  const digits = name.replace(/\D/g, "").length;
  const letters = name.replace(/[^a-z]/gi, "").length;

  return digits >= 4 && digits >= letters;
}

function findSuggestions(name: string): string[] {
  const normalizedLookup = exerciseNameLookup(name);
  const aliasTargets = new Map(
    resolveExerciseNameAlias(name).map((target, index) => [target, index])
  );

  return normalizedCatalog
    .map((item) => ({
      name: item.canonicalName,
      rank: aliasTargets.has(item.canonicalName)
        ? 0
        : item.lookupName.startsWith(normalizedLookup)
          ? 1
          : item.lookupName.includes(normalizedLookup)
            ? 2
            : 3,
      aliasOrder: aliasTargets.get(item.canonicalName) ?? Number.MAX_SAFE_INTEGER,
      priority: item.priority ? 0 : 1,
      score: boundedExerciseNameDistance(
        normalizedLookup,
        item.lookupName,
        MAX_SUGGESTION_DISTANCE
      )
    }))
    .filter((item) => item.rank < 3 || item.score <= MAX_SUGGESTION_DISTANCE)
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      if (left.aliasOrder !== right.aliasOrder) return left.aliasOrder - right.aliasOrder;
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 5)
    .map((item) => item.name);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
