# BPL design system

Built for one day: Sunday 4 Oct, open cricket ground, everyone on a phone in bright sun.
So: light theme, high contrast, big numbers, big tap targets. Tokens live in `app/globals.css` (`@theme`).
Picked with the ui-ux-pro-max skill ("Sports/Fitness" pairing, vibrant block style), then tuned for sunlight.

## Colour

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `ink` | #0b1510 | Body text, big numbers | 18.6:1 on white (AAA) |
| `muted` | #37473c | Secondary text, labels | 9.9:1 (AAA) |
| `paper` | #ffffff | Cards | |
| `canvas` | #f3f6f1 | Page background, table stripes | |
| `line` | #cbd5cc | Dividers only. Never text. | |
| `edge` | #56675b | Input and outline-button borders | 6:1 |
| `pitch` | #0b4d2c | Brand, primary buttons, header | white on it 9.9:1 |
| `pitch-dark` / `pitch-soft` | #07371f / #e1efe5 | Hover / success tint | |
| `gold` | #f5b301 | Accent fill: Register CTA, focus ring, Marquee, countdown | ink on it 10:1 |
| `gold-ink` | #6b4700 | Gold-toned text on white | 8.3:1 |
| `ball` | #b3261e | Unsold, errors, danger, "live" dot | white on it 6.5:1 |

`brand` / `brand-dark` still exist as aliases of `pitch` so older classes keep working.

**Teams** use their colour from settings (`teams.colour`). Text on a team colour is picked by `textOn()`.
If a colour is missing or invalid, `components/ui/team.ts` gives a fixed one by team order
(blue, red, purple, orange, …). Always use `teamStyle()` / `teamColour()`, never raw `team.colour`.

Rules:
- Never put gold text on white. Gold is a fill with ink text.
- No light greys for text. `muted` is the lightest text colour.
- Team colours are solid fills, not tints. Tints wash out in sunlight.

## Type

- **Display:** Barlow Condensed 600/700/800 (`font-display`). Headings, names, prices, purses, timers. Usually uppercase.
- **Body:** Barlow 400–700 (`font-sans`). Everything else. Base size 17px, line height 1.5.
- Both load via `next/font/google` in `app/layout.tsx` (self-hosted, no layout shift).
- Money, counts and timers get `.num` (tabular numbers) so digits don't jump as they change.
- Money always goes through `fmt()` from `lib/money.ts`.

Scale we actually use: 14 (labels) · 17 (body) · 20–24 (card titles) · 30–36 (section titles) · 48–96 (key numbers).

## Spacing, radius, shadow

- Spacing: Tailwind's 4px steps. Page gutter 16px (`px-4`). Stack gaps 12–20px (`space-y-3` to `space-y-5`).
- Width: phones first (375px). Public pages max 36rem (`narrow`) or 72rem (`wide`, board and home).
- Radius: `sm` 6 (badges) · `md` 10 (buttons, inputs) · `lg` 14 (cards) · `xl` 20 (player card).
- Shadow: `shadow-card` (soft lift) and `shadow-pop` (sheets, toasts, player card). Borders do the real work.

## Touch and motion

- Every tap target is at least 44px; buttons are 48px (`min-h-12`), console bid buttons 96px.
- Focus ring: 4px gold outline, offset 2px.
- Motion is 150–300ms, transform and opacity only:
  `animate-rise` (new bid, notices), `animate-sold-in` (SOLD stamp), countdown bar (`scaleX`).
- `prefers-reduced-motion` cuts all animation to ~0 in `globals.css`.

## Components

Shared, in `components/ui/`:

| Component | What it is |
|---|---|
| `Button`, `ButtonLink`, `buttonClass()` | Variants: primary, accent, outline, danger, ghost. Sizes md/lg/xl. |
| CSS classes | `.btn`, `.btn-accent`, `.btn-outline`, `.btn-danger`, `.btn-ghost`, `.link`, `.field`, `.label`, `.hint`, `.error`, `.choice`, `.card`, `.eyebrow`, `.num` |
| `Card` | White panel, optional title, aside and team-colour top strip |
| `Badge`, `RoleChip`, `BandChip`, `WkChip` | Solid chips. Marquee band is gold, WK is ink. |
| `Stat` | Label + big display number, inside a `<dl>` |
| `SectionHeader` | Eyebrow + display heading + optional right slot |
| `EmptyState` | Icon, one line, optional action |
| `PlayerPhoto` | Square photo; falls back to initials on pitch green |
| `PageShell`, `SiteHeader`, `SiteFooter` | Public page frame. Footer has the sponsor band. |
| `LogoMark` | Gold ball on a green tile (SVG) |
| `team.ts` | `teamColour`, `teamStyle`, fallback palette |

Also: `components/admin/StatusBadge` (one colour per status word), `components/admin/AdminNav` (tabs),
`components/auction/TeamBar` (`TeamBar`, `TeamChip`, `TeamDot`), `SignInCard` in `SignInGate.tsx`.

Icons: `lucide-react` only. Decorative icons get `aria-hidden`. No emoji.

## Sponsors

One look everywhere: white background, full-colour logo, a small "presented by" label. Sponsors never
sit on top of prices or compete with them.
- **Home:** title sponsor card under the hero (`hero`).
- **Footer band** on every public page, board included (`strip`).
- **Registration:** one slim card after each step (`reg_step`).
- **Board:** "Lot presented by" row at the bottom of the lot card, rotating by lot (`auction_lot`).

## Screens

- **Board:** lot card (photo, name, role, band, base, stats) → huge current bid → leading team bar →
  countdown bar. Purse cards 2×2 (leader outlined). Sold feed. Between lots: a SOLD stamp.
  Laptops: lot on the left, purses and sales on the right.
- **Owner view:** team bar, then purse left (biggest), max bid, slots left, per-player budget. Live lot, next 5.
- **Console:** sticky dark status bar. Bid buttons 2×2 in team colours (leader ringed). Big green SOLD,
  red-outline UNSOLD, SKIP, then Undo / Redo / Pause. Full-screen confirm before a sale.
- **Admin:** green header with tabs. Cards on phones, tables on laptops.

## Do / don't

- Do use tokens (`bg-pitch`, `text-muted`). Don't use raw Tailwind greys, emerald, amber or red.
- Do keep one primary action per screen. Don't put two green buttons side by side.
- Do keep accessible names stable (tests use them): "Register", "Mark paid", "Save changes", tier "A" etc.
- Do check 375px: no sideways scroll. Long names wrap (`break-words`), rows `truncate`.
- Don't add a dark theme with ad-hoc classes. If we add one, redefine the tokens only.
