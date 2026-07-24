import Link from "next/link";

import { LeadForm } from "@/components/LeadForm";

/**
 * Public landing page. Fully static except for the form, which is a client
 * component — nothing here reads the database, so it renders instantly and
 * can't be taken down by a database outage.
 */
export default function HomePage() {
  return (
    <>
      <header className="border-b border-slate-100">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              LD
            </span>
            LeadDesk<span className="text-slate-400">Mini</span>
          </span>
          <Link
            href="/admin"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Admin sign in
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* ---------------------------------------------------------------- */}
        {/* Hero + capture form                                               */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          {/* Soft brand wash behind the hero. Decorative only. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-gradient-to-b from-brand-50 via-white to-white"
          />

          <div className="mx-auto grid max-w-6xl gap-14 px-6 py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:py-24">
            {/* Value proposition */}
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                Now taking projects for Q3
              </span>

              <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Every enquiry, captured.
                <span className="block text-brand-600">
                  Nothing lost in an inbox.
                </span>
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                LeadDesk Mini turns your contact form into a working pipeline.
                Enquiries land in one place, get qualified by budget, and move
                from new to closed — so your team always knows who is still
                waiting on a reply.
              </p>

              <dl className="mt-10 grid gap-6 sm:grid-cols-3">
                <Stat label="Average first reply" value="< 1 day" />
                <Stat label="Enquiries captured" value="100%" />
                <Stat label="Setup time" value="5 min" />
              </dl>

              <ul className="mt-10 space-y-3">
                <Feature>
                  Qualified by budget before anyone picks up the phone
                </Feature>
                <Feature>
                  Searchable inbox with new / contacted / closed states
                </Feature>
                <Feature>Private admin area behind a real password</Feature>
              </ul>
            </div>

            {/* Capture form */}
            <div className="lg:pt-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  Tell us about your project
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Fill this in and we&rsquo;ll come back to you with a plan and
                  a price.
                </p>

                <div className="mt-7">
                  <LeadForm />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* How it works                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Three steps from a stranger filling in a form to a deal your team
              can actually track.
            </p>

            <ol className="mt-12 grid gap-6 sm:grid-cols-3">
              <Step
                n="1"
                title="They get in touch"
                body="The form validates as they type, so you never receive an enquiry with a typo'd email address."
              />
              <Step
                n="2"
                title="You qualify it"
                body="Every lead arrives tagged with a budget range and lands in the admin inbox marked NEW."
              />
              <Step
                n="3"
                title="You close it"
                body="Search by name or email, move leads to contacted, then closed. Nothing falls through."
              />
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} LeadDesk Mini.</p>
          <Link
            href="/admin"
            className="font-medium text-slate-600 transition hover:text-slate-900"
          >
            Admin
          </Link>
        </div>
      </footer>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-slate-700">
      <svg
        className="mt-0.5 h-5 w-5 shrink-0 text-brand-600"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
          clipRule="evenodd"
        />
      </svg>
      {children}
    </li>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-6">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
        {n}
      </span>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </li>
  );
}
