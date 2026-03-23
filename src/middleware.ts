import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth', '/partner/login', '/api/partner/auth'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Check auth cookie
    const token = request.cookies.get('auth_token')?.value;
    const validToken = process.env.AUTH_SECRET_TOKEN || 'raiz-ooh360-secret';

    if (token !== validToken && !pathname.startsWith('/partner')) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Check partner authentication
    if (pathname.startsWith('/partner') && pathname !== '/partner/login') {
        const partnerToken = request.cookies.get('partner_token')?.value;
        if (!partnerToken) {
            return NextResponse.redirect(new URL('/partner/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - _next (Next.js internals)
         * - Static files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
    ],
};
