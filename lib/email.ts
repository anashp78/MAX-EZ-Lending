import nodemailer from 'nodemailer'

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const FROM = process.env.EMAIL_FROM || 'MAX EV Business Lending <info@max-ev-holdings.com>'
const ADMIN_EMAIL = 'info@max-ev-holdings.com'
const BASE_URL = process.env.NEXTAUTH_URL || 'https://lending.maxevdigital.com'

export async function sendAdminNewApplicationEmail(app: {
  id: string
  businessName: string | null
  applicantName: string | null
  applicantEmail: string | null
  loanAmount: number | null
  createdAt: Date
}) {
  if (!process.env.SMTP_USER) return // credentials not yet set — skip silently

  await getTransport().sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `New Application — ${app.businessName || 'Unknown Business'} ($${app.loanAmount?.toLocaleString() || '?'})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
        <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0">
          <span style="color:#fff;font-weight:700;font-size:16px">MAX EV Business Lending</span>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:28px 24px;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 20px;font-size:20px">New Application Received</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#64748b;width:140px">Business</td><td style="padding:8px 0;font-weight:600">${app.businessName || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Applicant</td><td style="padding:8px 0">${app.applicantName || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="padding:8px 0">${app.applicantEmail || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Loan Amount</td><td style="padding:8px 0;font-weight:600;color:#059669">$${app.loanAmount?.toLocaleString() || '?'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Submitted</td><td style="padding:8px 0">${new Date(app.createdAt).toLocaleString()}</td></tr>
          </table>
          <div style="margin-top:24px">
            <a href="${BASE_URL}/admin/applications/${app.id}" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Application →</a>
          </div>
        </div>
      </div>
    `,
  })
}

export async function sendApplicantResultEmail(app: {
  applicantName: string | null
  applicantEmail: string | null
  id: string
  aiScore: number | null
  aiRecommendation: string | null
  qualifiedAmountMin: number
  qualifiedAmountMax: number
}) {
  if (!process.env.SMTP_USER || !app.applicantEmail) return

  const rec = app.aiRecommendation || 'manual_review'
  const recLabel =
    rec === 'lendio' ? 'Approved — Routing to Lendio' :
    rec === 'kapitus' ? 'Approved — Routing to Kapitus' :
    rec === 'manual_review' ? 'Under Manual Review' :
    'Not Approved at This Time'

  const recColor = (rec === 'lendio' || rec === 'kapitus') ? '#059669' : rec === 'manual_review' ? '#d97706' : '#dc2626'

  const showAmount = app.qualifiedAmountMin > 0

  await getTransport().sendMail({
    from: FROM,
    to: app.applicantEmail,
    subject: `Your Underwriting Results — Score ${app.aiScore ?? '?'}/100`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
        <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0">
          <span style="color:#fff;font-weight:700;font-size:16px">MAX EV Business Lending</span>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:28px 24px;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 6px;font-size:20px">Hi ${app.applicantName?.split(' ')[0] || 'there'},</h2>
          <p style="color:#64748b;margin:0 0 24px">Your underwriting analysis is complete. Here are your results:</p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px">
            <div style="display:flex;align-items:center;gap:20px">
              <div style="text-align:center">
                <div style="font-size:36px;font-weight:700;color:#0f172a">${app.aiScore ?? '—'}</div>
                <div style="font-size:12px;color:#94a3b8">/ 100</div>
              </div>
              <div>
                <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Decision</div>
                <div style="font-weight:700;color:${recColor};font-size:15px">${recLabel}</div>
              </div>
            </div>
            ${showAmount ? `
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0">
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Pre-Qualified Amount</div>
              <div style="font-size:22px;font-weight:700;color:#059669">$${app.qualifiedAmountMin.toLocaleString()} — $${app.qualifiedAmountMax.toLocaleString()}</div>
            </div>` : ''}
          </div>

          <p style="color:#64748b;font-size:14px;line-height:1.6">
            ${rec === 'lendio' || rec === 'kapitus'
              ? 'A lending specialist will be in touch within 1 business day to walk you through next steps and finalize your application.'
              : rec === 'manual_review'
              ? 'Our team will review your application within 2 business days and reach out with next steps.'
              : 'Unfortunately we were unable to match you with a lending partner at this time. You may reapply in 90 days.'}
          </p>

          <div style="margin-top:24px">
            <a href="${BASE_URL}/apply/decision?id=${app.id}" style="background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Full Results →</a>
          </div>

          <p style="margin-top:24px;font-size:12px;color:#94a3b8">MAX EV Business Lending is not a direct lender. Approval is subject to individual lender review.</p>
        </div>
      </div>
    `,
  })
}
