import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for MAX EV Business Lending.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="text-slate-500 hover:text-slate-900 text-sm transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            MAX EV Business Lending
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-8">

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">1. Information We Collect</h2>
            <p className="text-slate-600">When you apply for business financing through our platform, we collect information you provide directly, including:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
              <li>Business information: name, type, state, NAICS code, years in operation, annual revenue, employee count</li>
              <li>Applicant information: name, email address, phone number</li>
              <li>Financial profile: self-reported monthly revenue, average daily bank balance, monthly expenses, outstanding debt, NSF history range, and credit score range</li>
              <li>Loan request details: requested amount and purpose</li>
              <li>Supporting documents you choose to upload (bank statements, tax returns, business license)</li>
              <li>Social Security Number, if provided — stored in encrypted form only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">2. How We Use Your Information</h2>
            <p className="text-slate-600">We use the information collected to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
              <li>Run our AI-powered underwriting analysis and generate a pre-qualification score</li>
              <li>Match your profile to appropriate lending partners (Lendio, Kapitus, or others)</li>
              <li>Send you underwriting results and decision communications by email</li>
              <li>Write a lead or opportunity record to our CRM for follow-up by a lending specialist</li>
              <li>Comply with applicable laws and regulations</li>
            </ul>
            <p className="text-slate-600 mt-3">We do not sell your personal information. We do not perform a hard credit inquiry as part of our pre-qualification process.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">3. Information Sharing</h2>
            <p className="text-slate-600">We may share your information with:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
              <li><strong>Lending partners</strong> — when your profile is routed for formal application. Partners have their own privacy policies and underwriting criteria.</li>
              <li><strong>Service providers</strong> — AI, CRM, and email infrastructure used to operate the platform, under confidentiality obligations.</li>
              <li><strong>Legal authorities</strong> — when required by law, subpoena, or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">4. Data Security</h2>
            <p className="text-slate-600">We use industry-standard security measures including AES-256-GCM encryption for sensitive PII fields, TLS in transit, and access controls on our infrastructure. No method of transmission or storage is 100% secure. We encourage you not to share your Social Security Number unless specifically required.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">5. Data Retention</h2>
            <p className="text-slate-600">We retain application data for up to 7 years to comply with financial record-keeping requirements. You may request deletion of your data by contacting us, subject to our legal obligations.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">6. Your Rights</h2>
            <p className="text-slate-600">Depending on your jurisdiction, you may have rights to access, correct, or delete your personal data. To exercise these rights, contact us at <a href="mailto:info@max-ev-holdings.com" className="text-emerald-600 hover:underline">info@max-ev-holdings.com</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">7. Cookies and Analytics</h2>
            <p className="text-slate-600">We may use session cookies for authentication purposes. We may use analytics tools to understand platform usage. We do not use tracking cookies for advertising.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">8. Changes to This Policy</h2>
            <p className="text-slate-600">We may update this policy periodically. Continued use of the platform after changes constitutes acceptance. Material changes will be communicated by email where we have your contact information.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">9. Contact</h2>
            <p className="text-slate-600">MAX EV Business Lending<br />
            Email: <a href="mailto:info@max-ev-holdings.com" className="text-emerald-600 hover:underline">info@max-ev-holdings.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
