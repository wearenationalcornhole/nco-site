import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-white">
        <section className="bg-usaBlue text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl sm:text-4xl font-bold">Portal Login</h1>
            <p className="mt-2 text-white/80">Access your player profile, team, and tournament registrations.</p>
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
            <form className="rounded-2xl border border-gray-200 p-6 shadow-soft">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-usaBlue" placeholder="you@example.com" />

              <label className="block text-sm font-medium text-gray-700 mt-4">Password</label>
              <input type="password" className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-usaBlue" placeholder="••••••••" />

              <button type="button" className="mt-6 w-full rounded-full bg-usaRed px-4 py-2 font-semibold text-white hover:bg-[#8F1732]">
                Sign in
              </button>
              <p className="mt-3 text-center text-sm text-gray-600">Don&apos;t have an account? <a className="text-usaBlue hover:text-usaRed" href="#">Create one</a></p>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
