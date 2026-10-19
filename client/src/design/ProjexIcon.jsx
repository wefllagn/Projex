const assets = import.meta.glob(['../assets/icons/projex/*.svg', '!../assets/icons/projex/contact-sheet.svg'], { eager: true, query: '?url', import: 'default' })

export function ProjexIcon({ name, size = 20, label }) {
  const source = assets[`../assets/icons/projex/${name}.svg`]
  if (!source) return null
  return <img className="projex-icon" src={source} width={size} height={size} alt={label || ''} aria-hidden={label ? undefined : true} />
}
