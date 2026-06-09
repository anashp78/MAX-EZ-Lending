'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navbar */}
      <header className={`sticky top-0 z-50 bg-white border-b border-slate-100 transition-shadow ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold tracking-tight">ME</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm">MAX EV Business Lending</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#how-it-works" className="text-slate-500 hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#why-us" className="text-slate-500 hover:text-slate-900 transition-colors">Why Us</a>
            <Link href="/login" className="text-slate-500 hover:text-slate-900 transition-colors">Admin</Link>
            <Link
              href="/apply"
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Apply Now
            </Link>
          </nav>
          <Link href="/apply" className="md:hidden bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium">Apply</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-emerald-200">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
            AI-Powered Underwriting &mdash; No Credit Pull
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
            Fast Capital for<br />Growing Businesses.
          </h1>
          <p className="text-slate-500 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect your bank account. Our AI analyzes your cash flow, benchmarks your industry against SBA data, and routes you to the right lending partner in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-emerald-600/20"
            >
              Apply for Funding
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium px-6 py-4 transition-colors"
            >
              See how it works
            </a>
          </div>
          <p className="text-slate-400 text-sm mt-6">Free to apply &bull; No credit pull &bull; Decision in under 5 minutes</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-100 bg-white py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '< 5 min', label: 'Decision Time' },
            { value: '$25K–$5M', label: 'Loan Range' },
            { value: '72%', label: 'Approval Rate' },
            { value: '0', label: 'Credit Pulls' },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-slate-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Partner logos */}
      <section className="py-14 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-8">Powered by industry-leading partners</p>
          <div className="flex flex-wrap items-center justify-center gap-12">
            {[
              { name: 'Plaid', desc: 'Bank Connectivity' },
              { name: 'Lendio', desc: 'Lending Partner' },
              { name: 'Kapitus', desc: 'Lending Partner' },
              { name: 'SBA', desc: 'Data Source' },
            ].map(p => (
              <div key={p.name} className="text-center">
                <div className="text-slate-700 font-semibold text-sm">{p.name}</div>
                <div className="text-slate-400 text-xs mt-0.5">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How It Works</h2>
            <p className="text-slate-500">From application to funding decision in three steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Tell us about your business',
                desc: 'Complete a 5-minute application. Basic business details, what you need funding for. No SSN required upfront.',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Connect your bank account',
                desc: 'Securely link your business checking via Plaid. We analyze 12 months of cash flow. Your credentials are never stored.',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Get your decision',
                desc: 'Our AI underwrites in real time using SBA benchmarks and routes you to the best lending partner for your profile.',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-slate-200">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-5">
                  {item.icon}
                </div>
                <div className="text-emerald-600 font-mono text-xs font-bold mb-2 tracking-wider">{item.step}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
            >
              Start Your Application
            </Link>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section id="why-us" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Built different.</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Traditional lenders take weeks. We use AI to cut the process to minutes without cutting corners on analysis.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'SBA-Benchmarked Analysis',
                desc: 'Your application is compared against millions of historical SBA loans in your industry and state, not generic credit scores.',
              },
              {
                title: 'Multiple Lending Partners',
                desc: 'We route to Lendio, Kapitus, or other partners based on your profile. One application, multiple chances at approval.',
              },
              {
                title: 'Full Audit Trail',
                desc: 'Every AI decision is logged and explainable. You can see exactly what factors drove your score and recommendation.',
              },
            ].map(f => (
              <div key={f.title} className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6 bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to see if you qualify?</h2>
          <p className="text-slate-400 mb-8 text-lg">Takes 5 minutes. No credit pull. Free to apply.</p>
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-8 py-4 rounded-xl text-base transition-colors"
          >
            Start Your Application
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-slate-700 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">ME</span>
              </div>
              <span className="text-white font-semibold text-sm">MAX EV Business Lending</span>
            </div>
            <p className="text-sm max-w-xs">AI-powered small business financing. Fast decisions, multiple partners, no credit pull.</p>
          </div>
          <div className="flex gap-12 text-sm">
            <div>
              <div className="text-white font-medium mb-3">Apply</div>
              <div className="space-y-2">
                <div><Link href="/apply" className="hover:text-white transition-colors">Start Application</Link></div>
                <div><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></div>
              </div>
            </div>
            <div>
              <div className="text-white font-medium mb-3">Company</div>
              <div className="space-y-2">
                <div><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></div>
                <div><a href="#" className="hover:text-white transition-colors">Terms of Use</a></div>
                <div><Link href="/login" className="hover:text-white transition-colors">Admin Login</Link></div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-slate-800 text-xs text-slate-600">
          MAX EV Business Lending is not a direct lender. We connect applicants with lending partners including Lendio and Kapitus. Approval is not guaranteed and is subject to individual lender review and underwriting criteria.
        </div>
      </footer>
    </div>
  )
}
