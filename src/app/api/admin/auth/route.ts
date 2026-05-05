import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateWithMoco,
  createSession,
  getSession,
  COOKIE_NAME,
} from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// POST /api/admin/auth — Login with Moco credentials
export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'E-Mail und Passwort erforderlich' },
      { status: 400 }
    )
  }

  const user = await authenticateWithMoco(email, password)
  if (!user) {
    return NextResponse.json(
      { error: 'Ungültige Moco-Zugangsdaten' },
      { status: 401 }
    )
  }

  const token = await createSession(user)

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: `${user.firstname} ${user.lastname}`,
    },
  })

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24h
    path: '/',
  })

  return response
}

// GET /api/admin/auth — Check current session
export async function GET(request: NextRequest) {
  const user = await getSession(request)
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: `${user.firstname} ${user.lastname}`,
    },
  })
}

// DELETE /api/admin/auth — Logout
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
