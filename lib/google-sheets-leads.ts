import { createHash } from "node:crypto";

const DEFAULT_SHEET_NAME = "atendimento";

type SheetRow = Record<string, string>;

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const next = csv[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === ",") {
      row.push(value);
      value = "";
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      value = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      continue;
    }

    value += character;
  }

  if (value || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }

  return rows;
}

function rowsFromCsv(csv: string): SheetRow[] {
  const rows = parseCsv(csv);
  const headers = (rows.shift() || []).map((header) => header.trim());
  return rows.map((cells) => headers.reduce<SheetRow>((record, header, index) => {
    if (header) record[header] = (cells[index] || "").trim();
    return record;
  }, {}));
}

function dateToIso(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return value;
  const [, hour, minute, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).toISOString();
}

function stableExternalId(spreadsheetId: string, sheetName: string, row: SheetRow, rowIndex: number) {
  const identity = [
    spreadsheetId,
    sheetName,
    row.chatLid,
    row["Numero Whatsapp"],
    row["Data da 1 Conversa"],
    row.Conversas,
    rowIndex
  ].join("|");
  return createHash("sha256").update(identity).digest("hex");
}

function toPayload(row: SheetRow, spreadsheetId: string, sheetName: string, rowIndex: number) {
  const timestamp = dateToIso(row["Data da 1 Conversa"] || "");
  return {
    nome: row.Nome || "",
    numero: row["Numero Whatsapp"] || "",
    timestamp,
    mensagem: row.Conversas || "",
    chatLid: row.chatLid || "",
    status: [row.Status, row["Status do Corretor"], row.Encaminhamento].filter(Boolean).join(" "),
    fromMe: row.FromME || "",
    fromApi: row.FromAPI || "",
    source: "Google Sheets - atendimento",
    externalId: stableExternalId(spreadsheetId, sheetName, row, rowIndex),
    sheetRow: rowIndex,
    spreadsheetId,
    sheetName,
    rawSheetRow: row
  };
}

export async function fetchGoogleSheetsLeadRecords(options: {
  spreadsheetId: string;
  sheetName?: string;
}) {
  const spreadsheetId = options.spreadsheetId.trim();
  const sheetName = (options.sheetName || DEFAULT_SHEET_NAME).trim();
  if (!spreadsheetId) throw new Error("Spreadsheet ID nao configurado para o tenant.");
  if (!sheetName) throw new Error("Aba da planilha nao configurada para o tenant.");

  const url = new URL(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq`);
  url.searchParams.set("tqx", "out:csv");
  url.searchParams.set("sheet", sheetName);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Nao foi possivel ler a planilha de atendimento (HTTP ${response.status}).`);

  const csv = await response.text();
  if (!csv.trim()) return [];
  return rowsFromCsv(csv).map((row, index) => toPayload(row, spreadsheetId, sheetName, index + 2));
}
