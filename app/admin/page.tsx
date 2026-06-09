import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  submitted:    { label: 'Submitted',    bg: 'bg-slate-100',  color: 'text-slate-600' },
  under_review: { label: 'Under Review', bg: 'bg-amber-50',   color: 'text-amber-700' },
  approved:     { label: 'Approved',     bg: 'bg-emerald-50', color: 'text-emerald-700' },
  declined:     { label: 'Declined',     bg: 'bg-red-50',     color: 'text-red-700' },
  funded:       { label: 'Funded',       bg: 'bg-blue-50',    color: 'text-blue-700' },
}

const PER_PAGE = 25

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, q, status } = await searchParams
  const page = Math.max(1, Number(pageParam || 1))
  const search = q?.trim() || ''
  const statusFilter = status || ''

  const where = {
    ...(statusFilter && { status: statusFilter }),
    ...(search && {
      OR: [
        { businessName: { contains: search, mode: 'insensitive' as const } },
        { applicantName: { contains: search, mode: 'insensitive' as const } },
        { applicantEmail: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [total, pending, approved, declined, applications, totalFiltered] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { status: 'under_review' } }),
    prisma.application.count({ where: { status: 'approved' } }),
    prisma.application.count({ where: { status: 'declined' } }),
    prisma.application.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, businessName: true, applicantName: true, loanAmount: true,
        status: true, aiScore: true, aiRecommendation: true, createdAt: true,
      },
    }),
    prisma.application.count({ where }),
  ])

  const totalPages = Math.ceil(totalFiltered / PER_PAGE)

  function buildUrl(p: number, overrides?: { q?: string; status?: string }) {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    const sq = overrides?.q !== undefined ? overrides.q : search
    const ss = overrides?.status !== undefined ? overrides.status : statusFilter
    if (sq) params.set('q', sq)
    if (ss) params.set('status', ss)
    return `/admin${params.toString() ? `?${params}` : ''}`
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">ME</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm">MAX EV Business Lending</span>
            <span className="text-slate-300 text-sm ml-1">/</span>
            <span className="text-slate-500 text-sm">Admin</span>
          </div>
          <Link href="/" className="text-slate-400 hover:text-slate-700 text-sm transition-colors">
            View Site
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Application pipeline overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Applications', value: total,   color: 'text-slate-900' },
            { label: 'Under Review',        value: pending,  color: 'text-amber-600' },
            { label: 'Approved',            value: approved, color: 'text-emerald-600' },
            { label: 'Declined',            value: declined, color: 'text-red-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-slate-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Filters */}
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <h2 className="font-semibold text-slate-900">Applications</h2>
            <div className="flex flex-wrap gap-2">
              <form method="GET" action="/admin" className="flex gap-2">
                <input
                  name="q"
                  defaultValue={search}
                  placeholder="Search business, applicant..."
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 w-52 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
                <button type="submit" className="bg-slate-900 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">Search</button>
              </form>
              <div className="flex gap-1.5">
                {['', 'submitted', 'under_review', 'approved', 'declined', 'funded'].map(s => (
                  <Link
                    key={s}
                    href={buildUrl(1, { status: s })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === s
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s === '' ? 'All' : STATUS_CONFIG[s]?.label ?? s}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-3">Business</th>
                  <th className="px-6 py-3">Applicant</th>
                  <th className="px-6 py-3">Loan Amount</th>
                  <th className="px-6 py-3">AI Score</th>
                  <th className="px-6 py-3">Recommendation</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                      {search || statusFilter ? 'No applications match your filters.' : 'No applications yet.'}
                    </td>
                  </tr>
                )}
                {applications.map(app => {
                  const statusCfg = STATUS_CONFIG[app.status] ?? { label: app.status, bg: 'bg-slate-100', color: 'text-slate-600' }
                  const scoreColor =
                    app.aiScore == null ? 'text-slate-400' :
                    app.aiScore >= 70 ? 'text-emerald-600' :
                    app.aiScore >= 55 ? 'text-blue-600' :
                    app.aiScore >= 40 ? 'text-amber-600' :
                    'text-red-600'
                  return (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-900">
                        <Link href={`/admin/applications/${app.id}`} className="hover:text-emerald-700 transition-colors">
                          {app.businessName || <span className="text-slate-400">&#8212;</span>}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{app.applicantName || <span className="text-slate-400">&#8212;</span>}</td>
                      <td className="px-6 py-3 text-slate-700">{app.loanAmount ? `$${app.loanAmount.toLocaleString()}` : <span className="text-slate-400">&#8212;</span>}</td>
                      <td className="px-6 py-3">
                        {app.aiScore != null
                          ? <span className={`font-semibold font-mono ${scoreColor}`}>{app.aiScore}</span>
                          : <span className="text-slate-400">&#8212;</span>}
                      </td>
                      <td className="px-6 py-3 text-slate-600 capitalize">{app.aiRecommendation ? app.aiRecommendation.replace('_', ' ') : <span className="text-slate-400">&#8212;</span>}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-400 text-xs">{new Date(app.createdAt).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, totalFiltered)} of {totalFiltered}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={buildUrl(page - 1)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={buildUrl(page + 1)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
