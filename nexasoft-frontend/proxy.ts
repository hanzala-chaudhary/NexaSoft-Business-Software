import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Correct Function Export
export default function proxy(request: NextRequest) {
  
  // 2. Redirect Logic: If a user visits the root ("/"), send them to the actual app page
  if (request.nextUrl.pathname === '/') {
    // Replace '/dashboard' with your actual starting route (e.g., '/login' or '/home')
    return NextResponse.redirect(new URL('/dashboard', request.url)); 
  }

  // Let all other requests proceed normally
  return NextResponse.next(); 
}

// 3. Matcher Config: Ensures this proxy runs on the right paths
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};