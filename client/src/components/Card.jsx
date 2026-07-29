function Card({ title, eyebrow, children, actions, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(eyebrow || title || actions) && (
        <div className="card__header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      <div className="card__body">{children}</div>
    </section>
  )
}

export default Card
