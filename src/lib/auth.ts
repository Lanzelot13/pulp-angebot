import { NextRequest, NextResponse } from 'next/server'

/**
 * Validates the API key from the Authorization header.
 * Expected format: "Bearer <API_KEY>"
 */
export function requireApiKey(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const apiKey = process.env.API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server misconfigured: API_KEY not set' },
      { status: 500 }
    )
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    )
  }

  const token = authHeader.slice(7)
  if (token !== apiKey) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 403 }
    )
  }

  return null // Auth OK
}
