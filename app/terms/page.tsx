export const metadata = {
  title: 'Terms of Service | National Cornhole Organization',
  description: 'Terms of service for the National Cornhole Organization website and portal.',
}

const sections = [
  {
    title: 'Using the Site',
    body:
      'You may browse the public site and use available portal features for lawful personal or organizational use related to National Cornhole Organization events and community activity.',
  },
  {
    title: 'Accounts and Access',
    body:
      'Certain features require sign-in. Users are responsible for maintaining access to the email account used for authentication and for any activity performed through their account.',
  },
  {
    title: 'Content and Event Information',
    body:
      'Event information, schedules, product listings, and portal tools may change over time. Organizers are responsible for the accuracy of content they submit.',
  },
  {
    title: 'Future Commerce and Registration Features',
    body:
      'Some public-facing areas reference upcoming event registration or commerce capabilities. Availability, pricing, and operational terms may change as those features are completed.',
  },
]

export default function TermsPage() {
  return (
    <main className="bg-slate-50">
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
            Terms of Service
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
            Basic terms for using the site and portal.
          </h1>
          <p className="mt-6 text-base leading-7 text-slate-600">
            This page is a clean operating summary for the current site experience and can be
            replaced later with finalized legal language.
          </p>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                <p className="mt-2 text-base leading-7 text-slate-600">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
