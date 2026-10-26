// Append rows to a Google Sheet via a service account.
// Env required:
//   GOOGLE_SHEETS_ID   – sheet ID (from URL between /d/ and /edit)
//   GOOGLE_SHEETS_KEY  – full JSON of service account key (as a single line string)
// The sheet must be shared with the service account email (Editor).

import { google } from "googleapis";

export function sheetsEnabled(): boolean {
  return Boolean(process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SHEETS_KEY);
}

let cachedAuth: ReturnType<typeof google.auth.fromJSON> | null = null;
function getAuth() {
  if (cachedAuth) return cachedAuth;
  const raw = process.env.GOOGLE_SHEETS_KEY;
  if (!raw) throw new Error("GOOGLE_SHEETS_KEY missing");
  const creds = JSON.parse(raw);
  cachedAuth = google.auth.fromJSON(creds);
  // @ts-expect-error scopes is on JWT class
  cachedAuth.scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  return cachedAuth;
}

export async function appendOrderRow(row: (string | number)[]): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetId) return;
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth: auth as never });
  // Explicit A:O range forces the append into columns A..O (15-col row:
  // …status, Offre, Album). Previously "A:Z" let Sheets' table-detection pick
  // whichever column had data, which is why rows were landing off-anchor.
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "A:O",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}
