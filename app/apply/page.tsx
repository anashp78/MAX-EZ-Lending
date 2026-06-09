'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STEPS = [
  { id: 'business', label: 'Business' },
  { id: 'owner', label: 'Owner' },
  { id: 'loan', label: 'Loan' },
  { id: 'financial', label: 'Financial' },
]

const NSF_OPTIONS = [
  { value: '0', label: 'None (0)' },
  { value: '1-3', label: '1 - 3 times' },
  { value: '4-10', label: '4 - 10 times' },
  { value: '10+', label: 'More than 10' },
]

const CREDIT_OPTIONS = [
  { value: '720_plus', label: '720+ (Excellent)' },
  { value: '680_719', label: '680 - 719 (Good)' },
  { value: '620_679', label: '620 - 679 (Fair)' },
  { value: '580_619', label: '580 - 619 (Below Average)' },
  { value: 'below_580', label: 'Below 580' },
]

export default function ApplyPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    businessName: '',
    businessType: 'LLC',
    naicsCode: '',
    businessState: 'TX',
    yearsInBusiness: '',
    annualRevenue: '',
    employeeCount: '',
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    loanAmount: '',
    loanPurpose: '',
    monthlyRevenue: '',
    avgDailyBalance: '',
    monthlyExpenses: '',
    outstandingDebt: '',
    nsfRange: '0',
    creditScoreRange: '620_679',
  })

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  async function submitApplication() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          yearsInBusiness: form.yearsInBusiness ? Number(form.yearsInBusiness) : undefined,
          annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : undefined,
          employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
          loanAmount: Number(form.loanAmount),
          monthlyRevenue: form.monthlyRevenue ? Number(form.monthlyRevenue) : undefined,
          avgDailyBalance: form.avgDailyBalance ? Number(form.avgDailyBalance) : undefined,
          monthlyExpenses: form.monthlyExpenses ? Number(form.monthlyExpenses) : undefined,
          outstandingDebt: form.outstandingDebt ? Number(form.outstandingDebt) : undefined,
          nsfRange: form.nsfRange,
          creditScoreRange: form.creditScoreRange,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError('Something went wrong. Please check your information and try again.')
        setLoading(false)
        return
      }
      router.push(`/apply/decision?id=${data.applicationId}`)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400 transition-all'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">ME</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm">MAX EV Business Lending</span>
          </Link>
          <span className="text-slate-400 text-xs hidden sm:block">256-bit SSL encryption &bull; No credit pull</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        {/* Step progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    i < step ? 'bg-emerald-600 text-white' :
                    i === step ? 'bg-slate-900 text-white ring-4 ring-slate-100' :
                    'bg-white text-slate-400 ring-1 ring-slate-200'
                  }`}>
                    {i < step ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${i === step ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">
            {step === 0 && 'Business Information'}
            {step === 1 && 'Owner Information'}
            {step === 2 && 'Loan Details'}
            {step === 3 && 'Financial Profile'}
          </h1>
          <p className="text-slate-500 text-sm mb-7">
            {step === 0 && 'Tell us about the business applying for funding.'}
            {step === 1 && 'We need basic information about the primary owner.'}
            {step === 2 && 'How much do you need, and what for?'}
            {step === 3 && 'Help our AI understand your financial health. All fields are estimates.'}
          </p>

          <div className="space-y-5">
            {step === 0 && (
              <>
                <Field label="Business Legal Name" required>
                  <input className={inputClass} value={form.businessName} onChange={e => update('businessName', e.target.value)} placeholder="Acme LLC" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Business Type">
                    <select className={inputClass} value={form.businessType} onChange={e => update('businessType', e.target.value)}>
                      {['LLC', 'Corporation', 'Sole Proprietorship', 'Partnership'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="State">
                    <input className={inputClass} value={form.businessState} onChange={e => update('businessState', e.target.value.toUpperCase())} placeholder="TX" maxLength={2} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Years in Business">
                    <input className={inputClass} type="number" value={form.yearsInBusiness} onChange={e => update('yearsInBusiness', e.target.value)} placeholder="3" min="0" />
                  </Field>
                  <Field label="Annual Revenue ($)">
                    <input className={inputClass} type="number" value={form.annualRevenue} onChange={e => update('annualRevenue', e.target.value)} placeholder="250000" />
                  </Field>
                </div>
                <Field label="NAICS Code (optional)">
                  <input className={inputClass} value={form.naicsCode} onChange={e => update('naicsCode', e.target.value)} placeholder="722511" />
                  <p className="text-slate-400 text-xs mt-1">6-digit industry code. Leave blank if unknown.</p>
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Your Full Name" required>
                  <input className={inputClass} value={form.applicantName} onChange={e => update('applicantName', e.target.value)} placeholder="Jane Smith" />
                </Field>
                <Field label="Email Address" required>
                  <input className={inputClass} type="email" value={form.applicantEmail} onChange={e => update('applicantEmail', e.target.value)} placeholder="jane@acme.com" />
                </Field>
                <Field label="Phone Number">
                  <input className={inputClass} value={form.applicantPhone} onChange={e => update('applicantPhone', e.target.value)} placeholder="(214) 555-0100" />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Loan Amount Requested ($)" required>
                  <input className={inputClass} type="number" value={form.loanAmount} onChange={e => update('loanAmount', e.target.value)} placeholder="150000" />
                  <p className="text-slate-400 text-xs mt-1">We work with loans from $25,000 to $5,000,000.</p>
                </Field>
                <Field label="Number of Employees">
                  <input className={inputClass} type="number" value={form.employeeCount} onChange={e => update('employeeCount', e.target.value)} placeholder="12" min="1" />
                </Field>
                <Field label="Loan Purpose">
                  <textarea
                    className={`${inputClass} h-28 resize-none`}
                    value={form.loanPurpose}
                    onChange={e => update('loanPurpose', e.target.value)}
                    placeholder="Equipment purchase, working capital, expansion, inventory..."
                  />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Monthly Revenue ($)" required>
                    <input className={inputClass} type="number" value={form.monthlyRevenue} onChange={e => update('monthlyRevenue', e.target.value)} placeholder="25000" />
                  </Field>
                  <Field label="Avg Daily Balance ($)">
                    <input className={inputClass} type="number" value={form.avgDailyBalance} onChange={e => update('avgDailyBalance', e.target.value)} placeholder="15000" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Monthly Expenses ($)">
                    <input className={inputClass} type="number" value={form.monthlyExpenses} onChange={e => update('monthlyExpenses', e.target.value)} placeholder="18000" />
                  </Field>
                  <Field label="Outstanding Debt ($)">
                    <input className={inputClass} type="number" value={form.outstandingDebt} onChange={e => update('outstandingDebt', e.target.value)} placeholder="0" />
                  </Field>
                </div>
                <Field label="NSF / Returned Checks (last 12 months)">
                  <select className={inputClass} value={form.nsfRange} onChange={e => update('nsfRange', e.target.value)}>
                    {NSF_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Estimated Personal Credit Score">
                  <select className={inputClass} value={form.creditScoreRange} onChange={e => update('creditScoreRange', e.target.value)}>
                    {CREDIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <div className="bg-slate-50 rounded-lg px-4 py-3 text-xs text-slate-500">
                  All figures are estimates used for pre-qualification only. No credit pull will occur at this stage.
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="mt-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (step === 3) submitApplication()
                else setStep(s => s + 1)
              }}
              disabled={loading}
              className={`flex-1 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors ${
                step === 3 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {loading ? 'Analyzing...' : step === 3 ? 'Get My Decision' : 'Continue'}
            </button>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-5">
          Free to apply &bull; No credit pull &bull; 256-bit SSL encryption
        </p>
      </main>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
