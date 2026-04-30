export const metadata = {
  title: 'Privacy Policy | National Cornhole Organization',
  description: 'Privacy policy for the National Cornhole Organization website and community portal.',
}

const sections = [
  {
    title: 'Information We Collect',
    body:
      'We may collect contact details, account information, event registration details, and basic usage data needed to operate the site and community portal.',
  },
  {
    title: 'How We Use Information',
    body:
      'Information is used to support sign-in, event participation, organizer workflows, customer support, and improvements to the site experience.',
  },
  {
    title: 'Sharing and Storage',
    body:
      'We only share information with service providers and platform infrastructure needed to deliver site functionality. Data may be stored in secure third-party systems used by the platform.',
  },
  {
    title: 'Your Choices',
    body:
      'You can choose whether to join the community portal, provide optional profile details, or participate in event registration workflows when those features are available.',
  },
]

export default function PrivacyPage() {
  return (
    <main className="bg-slate-50">
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B31942]">
            Privacy Policy
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
            Respecting the community’s data.
          </h1>
          <p className="mt-6 text-base leading-7 text-slate-600">
            This page provides a plain-language summary of how the site and portal handle
            information. It is intended as a clean public placeholder until final legal copy is
            approved.
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
