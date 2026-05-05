import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'pulp-admin-session'
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'pulp-angebot-admin-secret-change-me'
)

export interface AdminUser {
  id: number
  email: string
  firstname: string
  lastname: string
}

// Authenticate against Moco API
export async function authenticateWithMoco(
  email: string,
  password: string
): Promise<AdminUser | null> {
  const mocoSubdomain = process.env.MOCO_SUBDOMAIN || 'pulpmedia'

  try {
    const res = await fetch(
      `https://${mocoSubdomain}.mocoapp.com/api/v1/session`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }
    )

    if (!res.ok) return null

    const data = await res.json()
    // Moco returns user data on successful login
    return {
      id: data.id,
      email: data.email || email,
      firstname: data.firstname || '',
      lastname: data.lastname || '',
    }
  } catch {
    return null
  }
}

// Create a session JWT and set cookie
export async function createSession(user: AdminUser): Promise<string> {
  const token = await new SignJWT({
    sub: String(user.id),
    email: user.email,
    name: `${user.firstname} ${user.lastname}`,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)

  return token
}

// Verify session from cookie
export async function getSession(
  request: NextRequest
): Promise<AdminUser | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const nameParts = ((payload.name as string) || '').split(' ')
    return {
      id: Number(payload.sub),
      email: (payload.email as string) || '',
      firstname: nameParts[0] || '',
      lastname: nameParts.slice(1).join(' ') || '',
    }
  } catch {
    return null
  }
}

// Get session from cookies() in server components
export async function getSessionFromCookies(): Promise<AdminUser | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const nameParts = ((payload.name as string) || '').split(' ')
    return {
      id: Number(payload.sub),
      email: (payload.email as string) || '',
      firstname: nameParts[0] || '',
      lastname: nameParts.slice(1).join(' ') || '',
    }
  } catch {
    return null
  }
}

// Middleware helper: require auth for admin routes
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | AdminUser> {
  const user = await getSession(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return user as AdminUser
}

export { COOKIE_NAME }
