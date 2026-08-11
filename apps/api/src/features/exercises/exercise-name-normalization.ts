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
  const limit = maximum + 1;
  let previous = Uint16Array.from(
    { length: columns.length + 1 },
    (_, index) => Math.min(index, limit)
  );
  let current = new Uint16Array(columns.length + 1);

  for (let row = 1; row <= rows.length; row += 1) {
    current.fill(limit);
    current[0] = Math.min(row, limit);
    const start = Math.max(1, row - maximum);
    const end = Math.min(columns.length, row + maximum);
    let rowMinimum = current[0]!;

    for (let column = start; column <= end; column += 1) {
      const substitution = rows[row - 1] === columns[column - 1] ? 0 : 1;
      current[column] = Math.min(
        previous[column]! + 1,
        current[column - 1]! + 1,
        previous[column - 1]! + substitution
      );
      rowMinimum = Math.min(rowMinimum, current[column]!);
    }
    if (rowMinimum > maximum) return limit;
    [previous, current] = [current, previous];
  }

  return Math.min(previous[columns.length]!, limit);
}
