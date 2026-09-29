import type { Snapshot } from "@/lib/auction/types";
import { teamById } from "@/lib/auction/view";
import { fmt } from "@/lib/money";
import { roleLabel } from "@/lib/registration/options";

/** Every lot in running order with its current state. */
export function LotTable({ snap }: { snap: Snapshot }) {
  if (snap.lots.length === 0) return <p className="text-muted">No lots yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-ink">
            {["#", "Player", "Set", "Tier", "Base", "Status"].map((h) => (
              <th key={h} className="p-1">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {snap.lots.map((l) => {
            const live = snap.state.lots[l.id];
            const team = teamById(snap, live?.soldTo);
            return (
              <tr key={l.id} className="border-b border-zinc-200">
                <td className="p-1 tabular-nums">{l.order}</td>
                <td className="p-1">
                  <span className="font-bold">{l.playerName}</span> <span className="text-muted">{roleLabel(l.role)}</span>
                </td>
                <td className="p-1">{l.setName}</td>
                <td className="p-1">{l.tier ?? "—"}</td>
                <td className="p-1 tabular-nums">{fmt(live?.base ?? l.base)}</td>
                <td className="p-1">
                  {live?.status ?? "queued"}
                  {team && live?.price !== undefined ? ` · ${team.short} ${fmt(live.price)}` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
