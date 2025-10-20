import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'National Cornhole Organization',
  description: 'Tournaments, gear, and community for cornhole players nationwide.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0A3161] text-white min-h-screen flex flex-col font-sans">
        <Header />
        <main className="flex-grow bg-[#0A3161] text-white">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}