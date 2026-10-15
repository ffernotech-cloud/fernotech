export type CsvValue = string | number | null | undefined;

function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);
  const needsQuotes =
    /[;"\r\n]/.test(text) || /^\s|\s$/.test(text);
  if (
    typeof value === "string" &&
    /^[\t\r\n ]*[=+\-@]/.test(text)
  ) {
    text = `'${text}`;
  }

  if (needsQuotes || /[;"\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function serializeCsv(
  headers: readonly string[],
  rows: readonly (readonly CsvValue[])[],
): string {
  const lines = [
    headers.map(escapeCsvValue).join(";"),
    ...rows.map((row) => row.map(escapeCsvValue).join(";")),
  ];

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
