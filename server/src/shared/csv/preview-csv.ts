import { createHash } from 'node:crypto'
import { AppError } from '../errors/app-error.js'

export interface ParsedCsv {
  rows: string[][]
  fingerprint: string
}

export function parseBoundedCsv(csv: string, header: readonly string[], maxRows: number, maxBytes = 262_144): ParsedCsv {
  if (Buffer.byteLength(csv, 'utf8') > maxBytes) {
    throw new AppError({ statusCode: 413, code: 'CSV_TOO_LARGE', message: 'The CSV exceeds the import limit.' })
  }
  const input = csv.replace(/^\uFEFF/, '')
  const records: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let justClosed = false
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { field += '"'; index += 1 }
      else if (char === '"') { quoted = false; justClosed = true }
      else field += char
    } else if (char === '"' && field === '' && !justClosed) {
      quoted = true
    } else if (char === ',') {
      row.push(field.trim()); field = ''; justClosed = false
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') index += 1
      row.push(field.trim()); field = ''; justClosed = false
      records.push(row); row = []
    } else if (justClosed || char === '"') {
      throw new AppError({ statusCode: 422, code: 'CSV_INVALID', message: 'The CSV has invalid quoting.' })
    } else field += char
  }
  if (quoted) throw new AppError({ statusCode: 422, code: 'CSV_INVALID', message: 'The CSV has an unclosed quoted field.' })
  if (field !== '' || row.length > 0) { row.push(field.trim()); records.push(row) }
  if (records.length === 0 || records[0]!.length !== header.length || records[0]!.some((name, index) => name !== header[index])) {
    throw new AppError({ statusCode: 422, code: 'CSV_HEADER_INVALID', message: `Expected the ${header.join(',')} header.` })
  }
  const rows = records.slice(1).filter((item) => item.some(Boolean))
  if (rows.length === 0 || rows.length > maxRows) {
    throw new AppError({ statusCode: 422, code: 'CSV_ROW_LIMIT', message: `Use between 1 and ${maxRows} data rows.` })
  }
  return { rows, fingerprint: createHash('sha256').update(csv).digest('hex') }
}
