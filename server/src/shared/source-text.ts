// Reject lone UTF-16 surrogates before hashing or passing text to PostgreSQL.
// Valid Unicode, comments and line endings are preserved without normalization.
export function isWellFormedText(value: string): boolean {
  return Buffer.from(value, 'utf8').toString('utf8') === value
}
