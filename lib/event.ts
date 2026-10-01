/** Season 4 event details from the organiser's flyer. The fee lives in seasons.config (admin settings). */
export const EVENT = {
  presenter: "Burnaby Falcons",
  title: "BPL 4.0",
  tagline: "Internal tennis cricket tournament",
  auction: { when: "Sunday 4 Oct 2026, 11:30 AM", where: "Sperling cricket ground" },
  matches: { dates: "Oct 11, 18 & 25", time: "7:30–11:00 AM" },
  venue: { name: "Sperling Ground North & South", address: "3860 Sperling Ave, Burnaby" },
  format: "Red sixer tennis ball · 8-over matches",
  /** Used when the database has no fee set yet. */
  fee: { text: "30 CAD per player", email: "burnabyfalcons@gmail.com" },
  cutoff: "First 44 players to pay are in the auction.",
} as const;

export const mapsLink = (address: string): string => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
