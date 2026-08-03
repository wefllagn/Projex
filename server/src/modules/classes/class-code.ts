import { randomInt } from 'node:crypto'

export const CLASS_CODE_LENGTH = 10
export const CLASS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CLASS_CODE_COLLISION_RETRIES = 5

export function generateClassCode(): string {
  let code = ''
  for (let index = 0; index < CLASS_CODE_LENGTH; index += 1) {
    code += CLASS_CODE_ALPHABET[randomInt(CLASS_CODE_ALPHABET.length)]
  }
  return code
}

export function normalizeClassCode(value: string): string {
  return value.trim().toUpperCase().replaceAll(/[-\s]/g, '')
}

export function formatClassCode(value: string): string {
  const normalized = normalizeClassCode(value)
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`
}

export function isValidClassCode(value: string): boolean {
  const normalized = normalizeClassCode(value)
  return (
    normalized.length === CLASS_CODE_LENGTH &&
    [...normalized].every((character) =>
      CLASS_CODE_ALPHABET.includes(character),
    )
  )
}
