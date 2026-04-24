import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Paths that never require authentication
const PUBLIC = ['/login', '/api/auth/login', '/api/auth/logout', '/api/health'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let public paths and Next.js internals through
  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    // ADMIN_SECRET must be set in production — reject all requests if missing
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Admin authentication not configured', { status: 503 });
    }
    // Dev only: skip auth
    return NextResponse.next();
  }

  const token = req.cookies.get('admin_session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const secret = new TextEncoder().encode(adminSecret);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    // Token invalid or expired — clear cookie and redirect
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete('admin_session');
    return res;
  }
}

export const config = {
  // Run on all routes except static files and images
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
