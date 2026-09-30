/** CSV export of the event log and the final lots. Opens cleanly in Sheets and Excel. */
import { fmt } from "../money";
import type { AuctionState } from "./reducer";
import type { LotMeta, TeamMeta } from "./types";
import { setLabel } from "./view";

type Cell = string | number | boolean | null | undefined;

/**
 * One CSV cell. Quotes when needed, doubles inner quotes, and defuses text
 * that a spreadsheet would run as a formula (a player named "=HYPERLINK(...)").
 */
export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const toCsv = (header: string[], rows: Cell[][]): string =>
  [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

export type CsvEvent = { seq: number; type: string; payload: unknown; undone: boolean; at: Date | string | null; actorEmail: string };

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const iso = (at: Date | string | null): string => (at instanceof Date ? at.toISOString() : (at ?? ""));

export function eventsCsv(events: CsvEvent[], lots: LotMeta[], teams: TeamMeta[]): string {
  const lotName = new Map(lots.map((l) => [l.id, l.playerName]));
  const teamName = new Map(teams.map((t) => [t.id, t.short]));
  const rows = [...events]
    .sort((a, b) => a.seq - b.seq)
    .map((e) => {
      const p = (e.payload ?? {}) as Record<string, unknown>;
      const amount = num(p.amount) ?? num(p.delta) ?? num(p.base);
      const lotId = str(p.lotId);
      const teamId = str(p.teamId);
      const note = str(p.note) ?? str(p.text) ?? (num(p.seq) !== undefined ? `event ${p.seq}` : undefined);
      return [
        e.seq,
        iso(e.at),
        e.type,
        lotId ? (lotName.get(lotId) ?? lotId) : "",
        teamId ? (teamName.get(teamId) ?? teamId) : "",
        amount,
        amount === undefined ? "" : fmt(Math.abs(amount)),
        e.undone ? "yes" : "",
        note,
        e.actorEmail,
      ];
    });
  return toCsv(["seq", "at_utc", "type", "player", "team", "amount_lakhs", "amount", "undone", "note", "by"], rows);
}

export function lotsCsv(lots: LotMeta[], state: AuctionState, teams: TeamMeta[]): string {
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const rows = [...lots]
    .sort((a, b) => a.order - b.order)
    .map((l) => {
      const s = state.lots[l.id];
      const price = s?.price;
      return [
        l.order,
        setLabel(l.setName),
        l.playerName,
        l.role,
        l.tier,
        s?.base ?? l.base,
        s?.status ?? "queued",
        s?.soldTo ? (teamName.get(s.soldTo) ?? s.soldTo) : "",
        price,
        price === undefined ? "" : fmt(price),
      ];
    });
  return toCsv(["order", "set", "player", "role", "tier", "base_lakhs", "status", "team", "price_lakhs", "price"], rows);
}
