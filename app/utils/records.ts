// Record merging + activity shaping, ported from the original workspace.js.

export function mergeRecords(previous: any[], incoming: any[]): any[] {
  const map = new Map(previous.map((row) => [row.id, row]));
  for (const row of incoming) map.set(row.id, { ...map.get(row.id), ...row });
  return [...map.values()].sort(
    (a, b) =>
      String(b.created_at ?? b.at ?? "").localeCompare(
        String(a.created_at ?? a.at ?? ""),
      ) || String(b.id ?? "").localeCompare(String(a.id ?? "")),
  );
}

const EVENT_ICONS: [string, string][] = [
  ["ANALYSIS", "spark"],
  ["PLAN", "plans"],
  ["COMMAND_UNKNOWN", "info"],
  ["COMMAND", "clock"],
  ["TRADE", "positions"],
];

// Shape an /audit event for <ActivityList>: kind → title/icon, linked IDs → description.
export function eventView(row: any): any {
  const kind = String(row.kind ?? "");
  const links = [
    row.position_ticket && `Ticket ${row.position_ticket}`,
    row.broker_order && `Order ${row.broker_order}`,
  ].filter(Boolean);
  return {
    ...row,
    title: kind.charAt(0) + kind.slice(1).toLowerCase().replaceAll("_", " "),
    description:
      [row.message, ...links].filter(Boolean).join(" · ") ||
      "Recorded by the server",
    type:
      EVENT_ICONS.find(([prefix]) => kind.startsWith(prefix))?.[1] ??
      "activity",
    state: kind === "COMMAND_UNKNOWN" ? "UNKNOWN" : "",
  };
}

export function csv(rows: any[], columns: string[]): string {
  const escape = (value: unknown) => {
    let s =
      value !== null && typeof value === "object"
        ? JSON.stringify(value) ?? ""
        : String(value ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    columns.map(escape).join(","),
    ...rows.map((row) => columns.map((c) => escape(row[c])).join(",")),
  ].join("\r\n");
}
