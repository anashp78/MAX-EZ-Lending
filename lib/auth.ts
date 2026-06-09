import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantSlug: { label: 'Tenant', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const tenant = await prisma.tenant.findUnique({
          where: { slug: (credentials.tenantSlug as string) || process.env.TENANT_DEFAULT_SLUG },
        })
        if (!tenant?.isActive) return null

        const user = await prisma.user.findUnique({
          where: { tenantId_email: { tenantId: tenant.id, email: credentials.email as string } },
        })
        if (!user?.isActive) return null

        if (user.passwordHash !== credentials.password) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: tenant.id, tenantSlug: tenant.slug }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId
        token.tenantSlug = (user as any).tenantSlug
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      ;(session.user as any).role = token.role
      ;(session.user as any).tenantId = token.tenantId
      ;(session.user as any).tenantSlug = token.tenantSlug
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
