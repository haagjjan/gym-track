import argon2 from "argon2";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export const argon2PasswordHasher: PasswordHasher = {
  async hash(password) {
    return argon2.hash(password);
  },
  async verify(hash, password) {
    return argon2.verify(hash, password);
  }
};
