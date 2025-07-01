import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Verifica se o usuário está autenticado pelo cookie do NextAuth
  const isLoggedIn = Boolean(
    request.cookies.get('next-auth.session-token') ||
    request.cookies.get('__Secure-next-auth.session-token')
  );
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|static|favicon.ico|public).*)'],
}; 