import { classInitial } from './class-links.js'
export default function ClassIdentityBadge({ classRecord, className = '', imageSrc }) {
  return <span className={`${className} origin-identity-badge`} aria-hidden="true">{imageSrc ? <img src={imageSrc} alt="" /> : classInitial(classRecord)}</span>
}
