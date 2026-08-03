import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Cookie check karta hai jo login page par set hoti hai
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true';
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');

  // Agar user login nahi hai aur dashboard ya kisi aur page par jane ki koshish kare
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Agar user login hai aur login page ya root (/) par aaye, to dashboard bhej do
  if (isLoggedIn && (isAuthPage || request.nextUrl.pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Ye config batati hai ke kin files par ye security apply karni hai
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};