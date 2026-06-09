export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import path from 'path'
import fs from 'fs/promises'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const applicationId = formData.get('applicationId') as string | null
  const docType = (formData.get('docType') as string | null) ?? 'other'
  const file = formData.get('file') as File | null

  if (!applicationId || !file) {
    return NextResponse.json({ error: 'applicationId and file are required' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PDF, JPG, and PNG files are accepted' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File must be under 10 MB' }, { status: 400 })
  }

  // Verify application exists
  const app = await prisma.application.findUnique({ where: { id: applicationId }, select: { id: true } })
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  const uploadsDir = path.join(process.cwd(), 'uploads')
  await fs.mkdir(uploadsDir, { recursive: true })

  const ext = path.extname(file.name) || '.pdf'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileName = `${applicationId}_${Date.now()}_${safeName}`
  const filePath = path.join(uploadsDir, fileName)

  const bytes = await file.arrayBuffer()
  await fs.writeFile(filePath, Buffer.from(bytes))

  const doc = await prisma.applicationDocument.create({
    data: {
      applicationId,
      type: docType,
      fileName: file.name,
      filePath,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  })

  return NextResponse.json({ documentId: doc.id, fileName: file.name }, { status: 201 })
}
