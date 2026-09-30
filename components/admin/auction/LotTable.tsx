import { TeamChip } from "@/components/auction/TeamBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { RoleChip } from "@/components/ui/Badge";
import type { Snapshot } from "@/lib/auction/types";
import { teamById } from "@/lib/auction/view";
import { fmt } from "@/lib/money";

/** Every lot in running order with its current state. Rows on phones, a table on laptops. */
export function LotTable({ snap }: { snap: Snapshot }) {
  if (snap.lots.length === 0) return <p className="text-muted">No lots yet.</p>;
  const rows = snap.lots.map((l) => {
    const live = snap.state.lots[l.id];
    return { l, live, team: teamById(snap, live?.soldTo) };
  });
  return (
    <>
      <ol className="max-h-[28rem] divide-y divide-line overflow-y-auto rounded-md border border-line md:hidden">
        {rows.map(({ l, live, team }) => (
          <li key={l.id} className="flex items-center gap-2 px-3 py-2">
            <span className="num w-7 shrink-0 text-sm font-bold text-muted">{l.order}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{l.playerName}</span>
              <span className="text-sm text-muted">
                {l.setName} · <span className="num">{fmt(live?.base ?? l.base)}</span>
              </span>
            </span>
            {team && live?.price !== undefined ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <TeamChip team={team} teams={snap.teams} />
                <span className="num font-display text-lg font-extrabold">{fmt(live.price)}</span>
              </span>
            ) : (
              <StatusBadge status={live?.status ?? "queued"} />
            )}
          </li>
        ))}
      </ol>

      <div className="hidden max-h-[36rem] overflow-auto rounded-md border border-line md:block">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-canvas text-sm tracking-wide text-muted uppercase">
            <tr>
              {["#", "Player", "Role", "Set", "Band", "Base", "Status"].map((h) => (
                <th key={h} scope="col" className="border-b border-line px-3 py-2 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ l, live, team }) => (
              <tr key={l.id} className="border-b border-line last:border-0 even:bg-canvas/60">
                <td className="num px-3 py-1.5 text-muted">{l.order}</td>
                <td className="px-3 py-1.5 font-bold">{l.playerName}</td>
                <td className="px-3 py-1.5">
                  <RoleChip role={l.role} short />
                </td>
                <td className="px-3 py-1.5">{l.setName}</td>
                <td className="px-3 py-1.5">{l.tier ?? "—"}</td>
                <td className="num px-3 py-1.5 font-semibold">{fmt(live?.base ?? l.base)}</td>
                <td className="px-3 py-1.5">
                  <span className="flex items-center gap-2">
                    <StatusBadge status={live?.status ?? "queued"} />
                    {team && live?.price !== undefined && (
                      <>
                        <TeamChip team={team} teams={snap.teams} />
                        <span className="num font-bold">{fmt(live.price)}</span>
                      </>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
