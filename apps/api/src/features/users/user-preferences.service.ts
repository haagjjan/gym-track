import type { UserPreferencesRepository } from "./user-preferences.repository.js";
import type { UpdateUserPreferences } from "./user-preferences.schemas.js";

export interface UserPreferencesShape {
  volumeHeatCeiling: number;
}

export interface UserPreferencesService {
  get(userId: string): Promise<UserPreferencesShape | null>;
  update(userId: string, input: UpdateUserPreferences): Promise<UserPreferencesShape | null>;
}

export function createUserPreferencesService(options: {
  repository: UserPreferencesRepository;
  now?: () => Date;
}): UserPreferencesService {
  const now = options.now ?? (() => new Date());

  return {
    get: (userId) => options.repository.find(userId),
    update: (userId, input) =>
      options.repository.update(userId, input.volumeHeatCeiling, now())
  };
}
