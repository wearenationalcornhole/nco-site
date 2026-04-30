import OrderSuccessClient from '../OrderSuccessClient'

export const metadata = {
  title: 'Checkout Success | National Cornhole Organization',
  description: 'Stripe checkout success page for the NCO store.',
}

export default async function ShopSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)]">
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <OrderSuccessClient sessionId={params.session_id} />
      </section>
    </main>
  )
}
