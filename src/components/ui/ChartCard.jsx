import { cardClassName } from './formStyles'

export default function ChartCard({ title, description, children }) {
  return (
    <section className={cardClassName}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        {description ? <p className="mt-1 text-xs text-neutral-500">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
