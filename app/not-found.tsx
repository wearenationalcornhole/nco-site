export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center bg-white px-6">
      <div className="text-center">
        <p className="text-sm font-semibold text-usaRed">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Page not found</h1>
        <p className="mt-4 text-gray-600">Sorry, we couldn’t find the page you’re looking for.</p>
        <div className="mt-6">
          <a href="/" className="inline-flex items-center rounded-full bg-usaBlue px-5 py-2 text-white hover:bg-[#082747]">Back home</a>
        </div>
      </div>
    </main>
  )
}