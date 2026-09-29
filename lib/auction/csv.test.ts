import { describe, expect, it } from "vitest";
import { csvCell, eventsCsv, lotsCsv, toCsv } from "./csv";
import type { AuctionState } from "./reducer";
import type { LotMeta, TeamMeta } from "./types";

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Rohit")).toBe("Rohit");
    expect(csvCell(550)).toBe("550");
    expect(csvCell(-500)).toBe("-500");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("Sharma, R")).toBe('"Sharma, R"');
    expect(csvCell('He said "500"')).toBe('"He said ""500"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell(" padded")).toBe('" padded"');
  });
  it("defuses spreadsheet formulas in text", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@me")).toBe("'@me");
  });
  it("joins rows with CRLF and ends with one", () => {
    expect(toCsv(["a", "b"], [[1, "x,y"]])).toBe('a,b\r\n1,"x,y"\r\n');
  });
});

const teams: TeamMeta[] = [{ id: "T1", name: "Strikers", short: "STR", colour: "#000", purseStart: 30000 }];
const lots: LotMeta[] = [
  { id: "L2", playerName: "A. Gill", role: "batter", tier: "C", photoUrl: null, card: {}, setName: "Batters", order: 2, base: 200 },
  { id: "L1", playerName: "R. Sharma", role: "bowler", tier: "B", photoUrl: null, card: {}, setName: "Bowlers", order: 1, base: 500 },
];

describe("exports", () => {
  it("events CSV names players and teams and marks undone rows", () => {
    const csv = eventsCsv(
      [
        { seq: 2, type: "SOLD", payload: { lotId: "L1", teamId: "T1", amount: 1250 }, undone: true, at: new Date("2026-10-04T18:00:00Z"), actorEmail: "op@x.com" },
        { seq: 3, type: "UNDO", payload: { seq: 2 }, undone: false, at: "2026-10-04T18:01:00.000Z", actorEmail: "op@x.com" },
        { seq: 1, type: "ADJUST_PURSE", payload: { teamId: "T1", delta: -500, note: "late fee" }, undone: false, at: null, actorEmail: "op@x.com" },
      ],
      lots,
      teams,
    );
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[0]).toBe("seq,at_utc,type,player,team,amount_lakhs,amount,undone,note,by");
    expect(lines[1]).toBe("1,,ADJUST_PURSE,,STR,-500,5 cr,,late fee,op@x.com");
    expect(lines[2]).toBe("2,2026-10-04T18:00:00.000Z,SOLD,R. Sharma,STR,1250,12.5 cr,yes,,op@x.com");
    expect(lines[3]).toBe("3,2026-10-04T18:01:00.000Z,UNDO,,,,,,event 2,op@x.com");
  });

  it("lots CSV is in running order with final status and price", () => {
    const state: AuctionState = {
      version: 3,
      status: "completed",
      teams: {},
      lots: {
        L1: { id: "L1", playerName: "R. Sharma", base: 500, order: 1, status: "sold", soldTo: "T1", price: 1250 },
        L2: { id: "L2", playerName: "A. Gill", base: 200, order: 2, status: "unsold" },
      },
    };
    const lines = lotsCsv(lots, state, teams).trimEnd().split("\r\n");
    expect(lines).toEqual([
      "order,set,player,role,tier,base_lakhs,status,team,price_lakhs,price",
      "1,Bowlers,R. Sharma,bowler,B,500,sold,Strikers,1250,12.5 cr",
      "2,Batters,A. Gill,batter,C,200,unsold,,,",
    ]);
  });
});
