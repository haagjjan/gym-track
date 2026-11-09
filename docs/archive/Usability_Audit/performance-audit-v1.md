# Performance Audit V1

## Status

Implemented pure-function algorithmic regression coverage for the current cleanup baseline. Browser and production measurement remain release-verification work.

## Regression Workloads

Run all workloads with Node.js 22. Each test warms the function, measures three samples, checks the median against a deliberately generous CI ceiling, and asserts the resulting output size.

| Package | Workload | Ceiling |
| --- | --- | --- |
| API | Parse and group the maximum 5,000-row canonical workout CSV | 750 ms |
| API | Evaluate 1,000 unknown exercise names for quality and suggestions | 2,000 ms |
| Web | Select one daily best set from 100,000 Progress rows | 750 ms |
| Web | Aggregate 52 weeks x 12 muscles with 40 high-cardinality contributions per muscle/week | 750 ms |

The grouping, suggestion, daily-selection, and aggregation tests also assert expected counts so a regression cannot appear fast by skipping work.

## Commands And CI

Run both package suites sequentially from the repository root:

```sh
pnpm test:performance
```

The API and web packages expose the same command for focused investigation. GitHub Actions runs the root command after `pnpm check`; package-level concurrency is fixed at one to reduce cross-test CPU contention.

## What The Gates Cover

- Canonical CSV parsing and grouping uses indexed workout/exercise/set state rather than repeated linear searches.
- Exercise-name suggestions use a bounded, row-based Levenshtein calculation and retain the existing accepted-distance behavior.
- Progress daily-best selection uses one pass through the rows with a per-day map.
- Weekly Volume aggregation uses maps and sets for muscle, exercise, and session identity.

## Limitations

These ceilings detect large algorithmic regressions in deterministic pure functions. They are not user-facing latency promises, do not test database queries or networks, and do not replace the browser page-load NFR, mobile GPU checks, production telemetry, or real-user monitoring.

Search request debouncing, server query plans, bundle size, hydration, 3D rendering cost, and Web Vitals should be evaluated with browser and production evidence during V1 release verification. Timing ceilings should change only with a recorded workload or environment rationale.
