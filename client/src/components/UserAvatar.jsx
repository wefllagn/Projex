export default function UserAvatar({ variant = 'neutral', imageSrc, className = 'student-user-avatar' }) {
  const asset = ['male', 'female'].includes(variant) ? `/assets/origin/avatars/${variant}.svg` : null
  return <span className={`${className} origin-user-avatar`} data-avatar={asset ? variant : 'neutral'} aria-hidden="true">
    {imageSrc || asset ? <img src={imageSrc || asset} alt="" /> : <svg viewBox="0 0 80 80" aria-hidden="true"><path fill="#365168" d="M8 80V66c0-17 14-25 32-25s32 8 32 25v14z" /><circle cx="40" cy="27" r="16" fill="#ead9bd" /></svg>}
  </span>
}
