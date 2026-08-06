export function normalizeExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function exerciseNameLookup(name: string): string {
  return normalizeExerciseName(name)
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9/]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function boundedExerciseNameDistance(
  source: string,
  candidate: string,
  maximum = 8
): number {
  if (Math.abs(source.length - candidate.length) > maximum) return maximum + 1;

  const [rows, columns] =
    source.length >= candidate.length ? [source, candidate] : [candidate, source];
  let previous = Uint16Array.from({ length: columns.length + 1 }, (_, index) => index);
  let current = new Uint16Array(columns.length + 1);

  for (let row = 1; row <= rows.length; row += 1) {
    current[0] = row;
    for (let column = 1; column <= columns.length; column += 1) {
      const substitution = rows[row - 1] === columns[column - 1] ? 0 : 1;
      current[column] = Math.min(
        previous[column]! + 1,
        current[column - 1]! + 1,
        previous[column - 1]! + substitution
      );
    }
    [previous, current] = [current, previous];
  }

  return Math.min(previous[columns.length]!, maximum + 1);
}
