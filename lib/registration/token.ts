import { randomBytes } from "node:crypto";

/** 15 random bytes → exactly 20 URL-safe characters (~120 bits). */
export const newEditToken = (): string => randomBytes(15).toString("base64url");

export const isEditToken = (value: string): boolean => /^[A-Za-z0-9_-]{20}$/.test(value);
