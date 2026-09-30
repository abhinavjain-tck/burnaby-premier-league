import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";

/** "Nothing here yet" block: icon, one line, optional action. */
export function EmptyState({ icon: Icon, title, children, action, className }: { icon?: LucideIcon; title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line bg-paper px-4 py-8 text-center", className)}>
      {Icon && <Icon aria-hidden className="size-8 text-muted" strokeWidth={2} />}
      <p className="font-display text-2xl font-bold uppercase">{title}</p>
      {children && <div className="max-w-sm text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
