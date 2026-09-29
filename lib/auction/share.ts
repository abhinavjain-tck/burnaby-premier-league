import { randomBytes } from "node:crypto";

/** Private link for a test auction: /auction/t/<token>. 20 URL-safe characters, unguessable but not secret-secret. */
export const newShareToken = (): string => randomBytes(15).toString("base64url");

export const isShareToken = (value: string): boolean => /^[A-Za-z0-9_-]{20}$/.test(value);

export const testBoardPath = (token: string): string => `/auction/t/${token}`;
