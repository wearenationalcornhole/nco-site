export default function EventCard({
  title,
  subtitle,
  image,
  href,
}: {
  title: string
  subtitle: string
  image: string
  href?: string
}) {
  const Wrapper = href ? 'a' : 'div'
  const wrapperProps = href
    ? { href, className: 'block group rounded-2xl bg-white p-6 shadow ring-1 ring-black/5 transition hover:shadow-lg' }
    : { className: 'group rounded-2xl bg-white p-6 shadow ring-1 ring-black/5 transition hover:shadow-lg' }

  return (
    // @ts-ignore - Wrapper can be 'a' or 'div'
    <Wrapper {...(wrapperProps as any)}>
      <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-neutral-200">
        <img src={image} alt={title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="text-gray-600">{subtitle}</p>
      <div className="mt-4">
        <span className="inline-flex items-center rounded-full bg-black px-4 py-2 text-ncoYellow font-semibold group-hover:bg-ncoYellow group-hover:text-black transition">
          View Details
        </span>
      </div>
    </Wrapper>
  )
}