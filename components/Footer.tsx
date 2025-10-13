export default function Footer() {
  return (
    <footer id="contact" className="bg-usaBlue text-white">
      <div className="h-0.5 w-full bg-usaRed" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-center">
        <h2 className="text-lg font-semibold">Get in Touch</h2>
        <p className="mt-2 text-white/80">Questions about events, partnerships, or custom gear?</p>
        <a href="mailto:info@wearenationalcornhole.com" className="mt-4 inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20">
          Email Us
        </a>
        <p className="mt-6 text-sm text-white/70">© {new Date().getFullYear()} National Cornhole Organization. All rights reserved.</p>
      </div>
    </footer>
  )
}
