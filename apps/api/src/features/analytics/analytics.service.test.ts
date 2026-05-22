import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  AnalyticsRepository,
  AnalyticsSetFilters,
  AnalyticsSetRecord,
  WeeklyVolumeFilters,
  WeeklyVolumeSetRecord
} from "./analytics.repository.js";
import { createAnalyticsService, estimatedOneRepMaxKg } from "./analytics.service.js";

const monday = new Date("2026-05-18T10:00:00.000Z");
const sunday = new Date("2026-05-24T10:00:00.000Z");
const nextMonday = new Date("2026-05-25T10:00:00.000Z");

class FakeAnalyticsRepository implements AnalyticsRepository {
  public exerciseSetFilters: AnalyticsSetFilters | null = null;
  public weeklyVolumeFilters: WeeklyVolumeFilters | null = null;

  public constructor(
    private readonly exerciseSets: AnalyticsSetRecord[] = exerciseRows(),
    private readonly weeklySets: WeeklyVolumeSetRecord[] = weeklyRows()
  ) {}

  public async findExerciseSets(filters: AnalyticsSetFilters): Promise<AnalyticsSetRecord[]> {
    this.exerciseSetFilters = filters;

    return this.exerciseSets;
  }

  public async findWeeklyVolumeSets(
    filters: WeeklyVolumeFilters
  ): Promise<WeeklyVolumeSetRecord[]> {
    this.weeklyVolumeFilters = filters;

    return this.weeklySets;
  }
}

describe("analytics service", () => {
  it("computes estimated one rep max with the Epley formula", () => {
    assert.equal(estimatedOneRepMaxKg("80.00", 8), "101.33");
  });

  it("returns exercise progress in API shape", async () => {
    const repository = new FakeAnalyticsRepository();
    const service = createAnalyticsService({ repository });
    const result = await service.getExerciseProgress("user-1", "exercise-1", {
      startDate: monday,
      endDate: sunday,
      includeWarmups: false
    });

    assert.equal(repository.exerciseSetFilters?.userId, "user-1");
    assert.equal(repository.exerciseSetFilters?.exerciseId, "exercise-1");
    assert.equal(repository.exerciseSetFilters?.includeWarmups, false);
    assert.equal(result.items[0]?.estimatedOneRepMaxKg, "101.33");
    assert.equal(result.items[0]?.sessionDate, monday.toISOString());
  });

  it("summarizes exercise sets and chooses the best top set by estimated max", async () => {
    const service = createAnalyticsService({ repository: new FakeAnalyticsRepository() });
    const result = await service.getExerciseSummary("user-1", "exercise-1", {});

    assert.equal(result.totalSets, 3);
    assert.equal(result.totalReps, 20);
    assert.equal(result.totalVolumeKg, "1580.00");
    assert.equal(result.averageRir, 1.7);
    assert.equal(result.bestTopSet?.setId, "set-2");
    assert.equal(result.bestTopSet?.estimatedOneRepMaxKg, "105.00");
  });

  it("returns empty summary values when no sets match", async () => {
    const service = createAnalyticsService({ repository: new FakeAnalyticsRepository([]) });
    const result = await service.getExerciseSummary("user-1", "exercise-1", {});

    assert.equal(result.totalSets, 0);
    assert.equal(result.totalReps, 0);
    assert.equal(result.totalVolumeKg, "0.00");
    assert.equal(result.averageRir, null);
    assert.equal(result.bestTopSet, null);
  });

  it("groups weekly volume by UTC Monday and primary muscle", async () => {
    const repository = new FakeAnalyticsRepository();
    const service = createAnalyticsService({ repository });
    const result = await service.getWeeklyVolume("user-1", {
      startDate: monday,
      endDate: nextMonday,
      muscleGroupIds: ["muscle-1"]
    });

    assert.equal(repository.weeklyVolumeFilters?.muscleGroupIds?.[0], "muscle-1");
    assert.deepEqual(result.weeks, [
      {
        weekStart: "2026-05-18",
        weekEnd: "2026-05-24",
        items: [
          {
            muscleGroup: { id: "muscle-1", slug: "chest", name: "Chest" },
            workingSets: 2
          }
        ]
      },
      {
        weekStart: "2026-05-25",
        weekEnd: "2026-05-31",
        items: [
          {
            muscleGroup: { id: "muscle-2", slug: "back", name: "Back" },
            workingSets: 1
          }
        ]
      }
    ]);
  });
});

function exerciseRows(): AnalyticsSetRecord[] {
  return [
    setRecord({ setId: "set-1", weightKg: "80.00", reps: 8, rir: 2, sessionDate: monday }),
    setRecord({ setId: "set-2", weightKg: "90.00", reps: 5, rir: 1, sessionDate: sunday }),
    setRecord({ setId: "set-3", weightKg: "70.00", reps: 7, rir: 2, sessionDate: nextMonday })
  ];
}

function setRecord(overrides: Partial<AnalyticsSetRecord>): AnalyticsSetRecord {
  return {
    workoutId: "workout-1",
    sessionExerciseId: "session-exercise-1",
    setId: "set-1",
    sessionDate: monday,
    setOrder: 1,
    setType: "working",
    weightKg: "80.00",
    reps: 8,
    rir: 2,
    ...overrides
  };
}

function weeklyRows(): WeeklyVolumeSetRecord[] {
  return [
    weeklyRecord({ sessionDate: monday }),
    weeklyRecord({ sessionDate: sunday }),
    weeklyRecord({
      sessionDate: nextMonday,
      muscleGroup: { id: "muscle-2", slug: "back", name: "Back", sortOrder: 2 }
    })
  ];
}

function weeklyRecord(overrides: Partial<WeeklyVolumeSetRecord>): WeeklyVolumeSetRecord {
  return {
    sessionDate: monday,
    muscleGroup: {
      id: "muscle-1",
      slug: "chest",
      name: "Chest",
      sortOrder: 1
    },
    ...overrides
  };
}
