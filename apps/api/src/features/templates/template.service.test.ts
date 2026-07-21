import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  NewTemplate,
  StartedTemplateWorkout,
  TemplateRecord,
  TemplateRepository
} from "./template.repository.js";
import { createTemplateService } from "./template.service.js";

const now = new Date("2026-07-14T10:00:00.000Z");

class FakeTemplateRepository implements TemplateRepository {
  public templates: TemplateRecord[] = [];
  public selectableIds = ["exercise-1", "exercise-2"];
  public created: NewTemplate | null = null;
  public startResult: StartedTemplateWorkout | "open_workout_exists" | null = null;

  async listTemplates(userId: string): Promise<TemplateRecord[]> {
    return this.templates.filter((template) => template.userId === userId);
  }
  async findTemplate(userId: string, templateId: string): Promise<TemplateRecord | null> {
    return this.templates.find((item) => item.userId === userId && item.id === templateId) ?? null;
  }
  async findSelectableExerciseIds(ids: string[]): Promise<string[]> {
    return ids.filter((id) => this.selectableIds.includes(id));
  }
  async createTemplate(input: NewTemplate): Promise<TemplateRecord> {
    this.created = input;
    const record = templateRecord(input.id, input.userId, input.name, input.exerciseIds);
    this.templates.push(record);
    return record;
  }
  async updateTemplate(userId: string, templateId: string, patch: { name?: string; exerciseIds?: string[] }): Promise<TemplateRecord | null> {
    const current = await this.findTemplate(userId, templateId);
    return current ? templateRecord(current.id, userId, patch.name ?? current.name, patch.exerciseIds ?? current.exercises.map((item) => item.exercise.id)) : null;
  }
  async duplicateTemplate(userId: string, templateId: string, newId: string, name?: string): Promise<TemplateRecord | null> {
    const current = await this.findTemplate(userId, templateId);
    return current ? templateRecord(newId, userId, name ?? `${current.name} Copy`, current.exercises.map((item) => item.exercise.id)) : null;
  }
  async deleteTemplate(userId: string, templateId: string): Promise<boolean> {
    return (await this.findTemplate(userId, templateId)) !== null;
  }
  async startWorkout(): Promise<StartedTemplateWorkout | "open_workout_exists" | null> {
    return this.startResult;
  }
  async createFromWorkout(input: { id: string; userId: string; name: string }): Promise<TemplateRecord | null> {
    return templateRecord(input.id, input.userId, input.name, ["exercise-1"]);
  }
  async updateFromWorkout(userId: string, templateId: string): Promise<TemplateRecord | null> {
    const current = await this.findTemplate(userId, templateId);
    return current ? templateRecord(current.id, userId, current.name, ["exercise-2"]) : null;
  }
}

describe("template service", () => {
  it("creates an ordered template and preserves duplicate exercise occurrences", async () => {
    const repository = new FakeTemplateRepository();
    const service = createTemplateService({ repository, now: () => now });
    const result = await service.createTemplate("user-1", {
      name: "Push A",
      exerciseIds: ["exercise-1", "exercise-2", "exercise-1"]
    });

    assert.equal(result.ok, true);
    assert.deepEqual(repository.created?.exerciseIds, ["exercise-1", "exercise-2", "exercise-1"]);
  });

  it("rejects an unavailable exercise without writing", async () => {
    const repository = new FakeTemplateRepository();
    const service = createTemplateService({ repository, now: () => now });
    const result = await service.createTemplate("user-1", {
      name: "Invalid",
      exerciseIds: ["exercise-missing"]
    });

    assert.deepEqual(result, { ok: false, reason: "exercise_not_found" });
    assert.equal(repository.created, null);
  });

  it("does not return another user's template", async () => {
    const repository = new FakeTemplateRepository();
    repository.templates = [templateRecord("template-1", "user-2", "Private", [])];
    const service = createTemplateService({ repository, now: () => now });

    assert.deepEqual(await service.getTemplate("user-1", "template-1"), {
      ok: false,
      reason: "not_found"
    });
  });

  it("maps the one-open-workout conflict when starting from a template", async () => {
    const repository = new FakeTemplateRepository();
    repository.templates = [templateRecord("template-1", "user-1", "Push A", [])];
    repository.startResult = "open_workout_exists";
    const service = createTemplateService({ repository, now: () => now });

    assert.deepEqual(await service.startWorkout("user-1", "template-1"), {
      ok: false,
      reason: "open_workout_exists"
    });
  });
});

function templateRecord(id: string, userId: string, name: string, exerciseIds: string[]): TemplateRecord {
  return {
    id,
    userId,
    name,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    exercises: exerciseIds.map((exerciseId, index) => ({
      id: `entry-${index}`,
      position: index + 1,
      exercise: {
        id: exerciseId,
        name: exerciseId,
        equipment: null,
        exerciseType: null,
        muscleGroups: []
      }
    }))
  };
}
