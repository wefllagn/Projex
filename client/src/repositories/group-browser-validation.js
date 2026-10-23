export const EXTENSIONS = ['java','md','txt','json','js','ts','jsx','tsx','css','html','xml','yaml','yml','sql','py','c','h','cpp']
export function browserFileSupported(path) {
  return typeof path === 'string' && path.length <= 240 && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(path) && path.split('/').every(part => part && /^[A-Za-z0-9]/.test(part) && !part.endsWith('.') && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) && EXTENSIONS.includes(path.split('.').at(-1)?.toLowerCase())
}
