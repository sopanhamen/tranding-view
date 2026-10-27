export function mergeRecords(previous, incoming) {
  const map = new Map(previous.map((row) => [row.id, row]));
  for (const row of incoming) map.set(row.id, { ...map.get(row.id), ...row });
  return [...map.values()].sort(
    (a, b) =>
      String(b.created_at ?? b.at ?? "").localeCompare(
        String(a.created_at ?? a.at ?? ""),
      ) || String(b.id ?? "").localeCompare(String(a.id ?? "")),
  );
}
export function eventView(row) {
  return {
    ...row,
    at: row.created_at,
    type:
      row.kind === "ANALYSIS"
        ? "spark"
        : row.kind === "PLAN"
          ? "plans"
          : "activity",
  };
}
export function csv(rows, columns) {
  const escape = (value) => {
    let s = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    columns.map(escape).join(","),
    ...rows.map((row) => columns.map((c) => escape(row[c])).join(",")),
  ].join("\r\n");
}
