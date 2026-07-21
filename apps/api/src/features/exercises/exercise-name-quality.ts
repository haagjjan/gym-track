import {
  blockedExerciseNames,
  blockedExerciseWordFragments,
  canonicalExerciseNames,
  priorityExerciseNames
} from "./exercise-name-catalog.js";

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
  normalizedName: normalizeExerciseName(name),
  lookupName: normalizeExerciseName(name).toLowerCase(),
  priority: (priorityExerciseNames as readonly string[]).includes(name)
}));

const blockedNames = new Set(blockedExerciseNames.map((name) => normalizeExerciseName(name)));
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

function normalizeExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function evaluateExerciseName(name: string): ExerciseNameEvaluation {
  const normalizedName = normalizeExerciseName(name);
  const normalizedLookup = normalizedName.toLowerCase();
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
  const normalizedLookup = name.toLowerCase();

  return normalizedCatalog
    .map((item) => ({
      name: item.canonicalName,
      priority: item.priority ? 0 : 1,
      score: suggestionScore(normalizedLookup, item.lookupName)
    }))
    .filter((item) => item.score < 7 || item.name.toLowerCase().includes(normalizedLookup))
    .sort((left, right) => {
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

function suggestionScore(source: string, candidate: string): number {
  if (candidate === source) {
    return 0;
  }

  if (candidate.includes(source) || source.includes(candidate)) {
    return Math.abs(candidate.length - source.length);
  }

  return boundedLevenshteinDistance(source, candidate);
}

function boundedLevenshteinDistance(source: string, candidate: string): number {
  if (Math.abs(source.length - candidate.length) > MAX_SUGGESTION_DISTANCE) {
    return MAX_SUGGESTION_DISTANCE + 1;
  }

  const [rows, columns] =
    source.length >= candidate.length ? [source, candidate] : [candidate, source];
  let previous = Uint16Array.from({ length: columns.length + 1 }, (_, index) => index);
  let current = new Uint16Array(columns.length + 1);

  for (let row = 1; row <= rows.length; row += 1) {
    current[0] = row;

    for (let column = 1; column <= columns.length; column += 1) {
      const substitutionCost = rows[row - 1] === columns[column - 1] ? 0 : 1;
      current[column] = Math.min(
        previous[column]! + 1,
        current[column - 1]! + 1,
        previous[column - 1]! + substitutionCost
      );
    }

    [previous, current] = [current, previous];
  }

  return Math.min(previous[columns.length]!, MAX_SUGGESTION_DISTANCE + 1);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
