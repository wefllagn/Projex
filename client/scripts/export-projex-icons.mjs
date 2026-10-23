// Deterministic exports using an existing Sharp installation; no downloads.
import { createRequire } from 'node:module'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const sharp = require(process.env.PROJEX_SHARP_MODULE || 'sharp')
const directory = fileURLToPath(new URL('../src/assets/icons/projex/', import.meta.url))
const names = (await readdir(directory)).filter((name) => name.endsWith('.svg')).sort()
let count = 0
for (const name of names) {
  const source = await readFile(`${directory}/${name}`)
  for (const size of name === 'contact-sheet.svg' ? [840] : [24, 48, 96]) {
    const output = `${directory}/${name.replace('.svg', '')}${name === 'contact-sheet.svg' ? '' : `-${size}`}.png`
    await sharp(source).resize({ width: size }).png({ compressionLevel: 9, adaptiveFiltering: false }).toFile(output)
    const metadata = await sharp(output).metadata()
    if (metadata.width !== size || (name !== 'contact-sheet.svg' && (!metadata.hasAlpha || metadata.height !== size))) throw Error(`Invalid icon export: ${name}`)
    if (name !== 'contact-sheet.svg') {
      const stats = await sharp(output).stats()
      if (stats.channels[3].min !== 0 || stats.channels[3].max === 0) throw Error(`Missing transparency or artwork: ${name}`)
    }
    count += 1
  }
}
console.log(`${names.length - 1} SVG icons; ${count - 1} transparent PNG icons; contact sheet exported and dimensions verified.`)
