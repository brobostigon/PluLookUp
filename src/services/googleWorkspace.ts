import { getAccessToken } from './googleAuth.ts';
import { PLUItem, ScannedRecord, PLUCategory } from '../types.ts';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
  owners?: { displayName: string; emailAddress: string }[];
}

export interface SheetInfo {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
}

export interface SpreadsheetMetadata {
  id: string;
  title: string;
  sheets: SheetInfo[];
  url: string;
}

export interface ParsedPluPreview {
  plu: string;
  name: string;
  category: PLUCategory;
  price?: number;
  priceUnit?: 'kg' | 'unit';
  barcode?: string;
  visualDescription?: string;
  isValid: boolean;
  validationError?: string;
}

/**
 * List Google Spreadsheets from user's Google Drive
 */
export async function listDriveSpreadsheets(): Promise<DriveSpreadsheetFile[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in first.');

  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('files(id, name, modifiedTime, webViewLink, owners)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=25`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to list spreadsheets (${response.status})`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
    owners: f.owners
  }));
}

/**
 * Create a new Google Spreadsheet and populate it with PLU catalog items
 */
export async function exportCatalogToGoogleSheet(
  spreadsheetTitle: string,
  items: PLUItem[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; totalItems: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in first.');

  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: spreadsheetTitle || `PLU Catalog - ${new Date().toLocaleDateString()}`
      },
      sheets: [
        {
          properties: {
            title: 'PLU Inventory',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create Google Sheet');
  }

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;
  const sheetTitle = createData.sheets?.[0]?.properties?.title || 'PLU Inventory';
  const spreadsheetUrl = createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare tabular data
  const headers = [
    'PLU Code',
    'Item Name',
    'Category',
    'Price (€)',
    'Price Unit',
    'Barcode',
    'Visual Description / Keywords',
    'Active Status',
    'Last Updated'
  ];

  const rows = items.map(item => [
    item.plu,
    item.name,
    item.category,
    item.price !== undefined ? item.price : '',
    item.priceUnit || 'kg',
    item.barcode || '',
    item.visualDescription || '',
    item.active !== false ? 'Active' : 'Inactive',
    item.updatedAt ? new Date(item.updatedAt).toLocaleString() : new Date().toLocaleString()
  ]);

  const values = [headers, ...rows];

  // 3. Write data to sheet
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `'${sheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values
      })
    }
  );

  if (!writeRes.ok) {
    const err = await writeRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to write data to Google Sheet');
  }

  // 4. Polish format (Header styling: emerald background, bold white text)
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.05, green: 0.35, blue: 0.22 },
                  textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: headers.length
              }
            }
          }
        ]
      })
    });
  } catch (styleErr) {
    console.warn('Optional spreadsheet styling error:', styleErr);
  }

  return { spreadsheetId, spreadsheetUrl, totalItems: items.length };
}

/**
 * Export Register Slip records to Google Sheets
 */
export async function exportSlipToGoogleSheet(
  title: string,
  records: ScannedRecord[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; totalItems: number; totalAmount: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in first.');

  const spreadsheetTitle = title || `Register Slip - ${new Date().toLocaleTimeString()} ${new Date().toLocaleDateString()}`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title: spreadsheetTitle },
      sheets: [
        {
          properties: {
            title: 'Checkout Slip',
            gridProperties: { frozenRowCount: 1 }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create Google Sheet for Register Slip');
  }

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;
  const sheetTitle = createData.sheets?.[0]?.properties?.title || 'Checkout Slip';
  const spreadsheetUrl = createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const headers = [
    'Time',
    'PLU',
    'Item Name',
    'Category',
    'Quantity',
    'Weight (kg)',
    'Unit Price (€)',
    'Line Total (€)'
  ];

  let grandTotal = 0;
  const rows = records.map(r => {
    const unitPrice = r.price || 0;
    const isWeighed = r.weightKg && r.weightKg > 0;
    const lineTotal = isWeighed ? (r.weightKg! * unitPrice) : (r.quantity * unitPrice);
    grandTotal += lineTotal;

    return [
      r.timestamp || new Date().toLocaleTimeString(),
      r.plu,
      r.name,
      r.category,
      r.quantity,
      isWeighed ? r.weightKg!.toFixed(3) : '-',
      unitPrice.toFixed(2),
      lineTotal.toFixed(2)
    ];
  });

  // Summary row
  const summaryRow = ['TOTAL', '', '', '', records.reduce((acc, r) => acc + r.quantity, 0), '', '', grandTotal.toFixed(2)];
  const values = [headers, ...rows, summaryRow];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `'${sheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values
      })
    }
  );

  return { spreadsheetId, spreadsheetUrl, totalItems: records.length, totalAmount: grandTotal };
}

/**
 * Fetch spreadsheet metadata and list of sheet tabs
 */
export async function getSpreadsheetDetails(spreadsheetId: string): Promise<SpreadsheetMetadata> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in first.');

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch sheet info (${res.status})`);
  }

  const data = await res.json();
  const sheets: SheetInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title,
    rowCount: s.properties.gridProperties?.rowCount || 100,
    columnCount: s.properties.gridProperties?.columnCount || 26
  }));

  return {
    id: spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  };
}

/**
 * Read raw rows from a Google Sheet tab
 */
export async function readSpreadsheetValues(spreadsheetId: string, sheetTitle: string): Promise<string[][]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in first.');

  const range = encodeURIComponent(`'${sheetTitle}'!A1:Z500`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to read spreadsheet values (${res.status})`);
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Parse rows from a spreadsheet into valid PLU candidate items
 */
export function parseSpreadsheetRowsToPLUs(rows: string[][]): ParsedPluPreview[] {
  if (rows.length === 0) return [];

  // Inspect first row to find column indexes
  const headerRow = rows[0].map(h => String(h || '').trim().toLowerCase());
  
  let pluIdx = headerRow.findIndex(h => h.includes('plu') || h.includes('code') || h.includes('nummer'));
  let nameIdx = headerRow.findIndex(h => h.includes('name') || h.includes('bezeichnung') || h.includes('item') || h.includes('artikel'));
  let catIdx = headerRow.findIndex(h => h.includes('cat') || h.includes('kategori') || h.includes('warengruppe') || h.includes('type'));
  let priceIdx = headerRow.findIndex(h => h.includes('price') || h.includes('preis') || h.includes('cost') || h.includes('eur') || h.includes('€'));
  let unitIdx = headerRow.findIndex(h => h.includes('unit') || h.includes('einheit'));
  let barcodeIdx = headerRow.findIndex(h => h.includes('barcode') || h.includes('ean') || h.includes('upc'));
  let descIdx = headerRow.findIndex(h => h.includes('desc') || h.includes('visual') || h.includes('keyword') || h.includes('beschreibung'));

  // Default fallbacks if header row doesn't match standard keywords
  let startIndex = 1;
  if (pluIdx === -1 && nameIdx === -1) {
    // Assume row 0 is already data if first column is numeric
    if (/^\d{3,6}$/.test(String(rows[0][0] || '').trim())) {
      pluIdx = 0;
      nameIdx = 1;
      catIdx = 2;
      priceIdx = 3;
      startIndex = 0;
    } else {
      pluIdx = 0;
      nameIdx = 1;
      catIdx = 2;
      priceIdx = 3;
      startIndex = 1;
    }
  }

  const results: ParsedPluPreview[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) continue;

    const rawPlu = String(row[pluIdx] || '').trim().replace(/[^0-9]/g, '');
    const rawName = String(row[nameIdx] || '').trim();
    const rawCat = String(row[catIdx] || '').trim();
    const rawPriceStr = String(row[priceIdx] || '').trim().replace(',', '.');
    const rawPrice = parseFloat(rawPriceStr);
    const rawUnit = String(row[unitIdx] || '').trim().toLowerCase();
    const rawBarcode = String(row[barcodeIdx] || '').trim();
    const rawDesc = String(row[descIdx] || '').trim();

    let category: PLUCategory = 'Produce';
    const lowerCat = rawCat.toLowerCase();
    if (lowerCat.includes('bake') || lowerCat.includes('back')) category = 'Bakery';
    else if (lowerCat.includes('nut') || lowerCat.includes('nuss')) category = 'Nuts';
    else if (lowerCat.includes('other') || lowerCat.includes('sonst')) category = 'Other';

    const isValid = rawPlu.length >= 2 && rawName.length > 0;
    const validationError = !rawPlu
      ? 'Missing PLU code'
      : !rawName
      ? 'Missing item name'
      : undefined;

    results.push({
      plu: rawPlu,
      name: rawName,
      category,
      price: isNaN(rawPrice) ? undefined : rawPrice,
      priceUnit: rawUnit.includes('unit') || rawUnit.includes('stk') ? 'unit' : 'kg',
      barcode: rawBarcode || undefined,
      visualDescription: rawDesc || `High-quality ${rawName.toLowerCase()} in store inventory`,
      isValid,
      validationError
    });
  }

  return results;
}

/**
 * Backup entire PLU database as JSON to Google Drive
 */
export async function backupDatabaseToGoogleDrive(
  items: PLUItem[]
): Promise<{ fileId: string; fileName: string; webViewLink: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in first.');

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `plu-snap-sync-backup-${dateStr}.json`;

  const payload = {
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    system: 'PLU Snap & Sync',
    items
  };

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `PLU Snap & Sync Database Backup containing ${items.length} produce and bakery items.`
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(payload, null, 2) +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to upload backup to Google Drive');
  }

  const data = await res.json();
  return {
    fileId: data.id,
    fileName: data.name,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`
  };
}
