-- Up Migration

INSERT INTO muscle_groups (id, slug, name, sort_order)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'chest', 'Chest', 1),
  ('00000000-0000-4000-8000-000000000002', 'back', 'Back', 2),
  ('00000000-0000-4000-8000-000000000003', 'shoulders', 'Shoulders', 3),
  ('00000000-0000-4000-8000-000000000004', 'biceps', 'Biceps', 4),
  ('00000000-0000-4000-8000-000000000005', 'triceps', 'Triceps', 5),
  ('00000000-0000-4000-8000-000000000006', 'forearms', 'Forearms', 6),
  ('00000000-0000-4000-8000-000000000007', 'quads', 'Quads', 7),
  ('00000000-0000-4000-8000-000000000008', 'hamstrings', 'Hamstrings', 8),
  ('00000000-0000-4000-8000-000000000009', 'glutes', 'Glutes', 9),
  ('00000000-0000-4000-8000-000000000010', 'calves', 'Calves', 10),
  ('00000000-0000-4000-8000-000000000011', 'abs', 'Abs', 11),
  ('00000000-0000-4000-8000-000000000012', 'traps', 'Traps', 12);

-- Down Migration

DELETE FROM muscle_groups
WHERE slug IN (
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'traps'
);
