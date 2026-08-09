// Indian national holidays & major festivals.
// Fixed-date national holidays are generated for any year; movable festivals
// use the officially observed dates for the years listed.
export type Holiday = { date: string; name: string; kind: "national" | "festival" };

const FIXED: Array<{ md: string; name: string; kind: Holiday["kind"] }> = [
  { md: "01-01", name: "New Year's Day", kind: "festival" },
  { md: "01-26", name: "Republic Day", kind: "national" },
  { md: "04-14", name: "Ambedkar Jayanti", kind: "national" },
  { md: "05-01", name: "Labour Day", kind: "festival" },
  { md: "08-15", name: "Independence Day", kind: "national" },
  { md: "10-02", name: "Gandhi Jayanti", kind: "national" },
  { md: "12-25", name: "Christmas", kind: "festival" },
];

const MOVABLE: Record<string, Array<[string, string]>> = {
  "2025": [
    ["2025-01-14", "Makar Sankranti / Pongal"],
    ["2025-02-26", "Maha Shivaratri"],
    ["2025-03-14", "Holi"],
    ["2025-03-31", "Eid-ul-Fitr"],
    ["2025-04-06", "Ram Navami"],
    ["2025-04-10", "Mahavir Jayanti"],
    ["2025-04-18", "Good Friday"],
    ["2025-05-12", "Buddha Purnima"],
    ["2025-06-07", "Bakri Eid (Eid-ul-Adha)"],
    ["2025-07-06", "Muharram"],
    ["2025-08-09", "Raksha Bandhan"],
    ["2025-08-16", "Janmashtami"],
    ["2025-08-27", "Ganesh Chaturthi"],
    ["2025-10-02", "Dussehra"],
    ["2025-10-20", "Diwali"],
    ["2025-11-05", "Guru Nanak Jayanti"],
  ],
  "2026": [
    ["2026-01-14", "Makar Sankranti / Pongal"],
    ["2026-02-15", "Maha Shivaratri"],
    ["2026-03-03", "Holika Dahan"],
    ["2026-03-04", "Holi"],
    ["2026-03-20", "Eid-ul-Fitr"],
    ["2026-03-26", "Ram Navami"],
    ["2026-03-31", "Mahavir Jayanti"],
    ["2026-04-03", "Good Friday"],
    ["2026-05-01", "Buddha Purnima"],
    ["2026-05-27", "Bakri Eid (Eid-ul-Adha)"],
    ["2026-06-26", "Muharram"],
    ["2026-08-28", "Raksha Bandhan"],
    ["2026-09-04", "Janmashtami"],
    ["2026-09-14", "Ganesh Chaturthi"],
    ["2026-10-20", "Dussehra"],
    ["2026-11-08", "Diwali"],
    ["2026-11-10", "Bhai Dooj"],
    ["2026-11-24", "Guru Nanak Jayanti"],
  ],
  "2027": [
    ["2027-01-15", "Makar Sankranti / Pongal"],
    ["2027-03-06", "Maha Shivaratri"],
    ["2027-03-10", "Eid-ul-Fitr"],
    ["2027-03-22", "Holi"],
    ["2027-03-26", "Good Friday"],
    ["2027-04-15", "Ram Navami"],
    ["2027-05-17", "Bakri Eid (Eid-ul-Adha)"],
    ["2027-05-20", "Buddha Purnima"],
    ["2027-08-25", "Janmashtami"],
    ["2027-09-04", "Ganesh Chaturthi"],
    ["2027-10-09", "Dussehra"],
    ["2027-10-29", "Diwali"],
    ["2027-11-14", "Guru Nanak Jayanti"],
  ],
};

const cache = new Map<number, Map<string, Holiday[]>>();

/** Holidays for a year, keyed by YYYY-MM-DD. */
export function holidaysForYear(year: number): Map<string, Holiday[]> {
  const hit = cache.get(year);
  if (hit) return hit;

  const map = new Map<string, Holiday[]>();
  const push = (h: Holiday) => {
    const arr = map.get(h.date) ?? [];
    if (!arr.some((x) => x.name === h.name)) arr.push(h);
    map.set(h.date, arr);
  };

  for (const f of FIXED) push({ date: `${year}-${f.md}`, name: f.name, kind: f.kind });
  for (const [date, name] of MOVABLE[String(year)] ?? []) push({ date, name, kind: "festival" });

  cache.set(year, map);
  return map;
}

export function holidaysOn(iso: string): Holiday[] {
  const year = Number(iso.slice(0, 4));
  if (!Number.isFinite(year)) return [];
  return holidaysForYear(year).get(iso) ?? [];
}
