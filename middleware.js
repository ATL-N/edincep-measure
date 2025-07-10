// middleware.js
import { NextResponse } from "next/server";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

    console.log("Middleware running for:", pathname);


  // Define public paths
  const publicPaths = ["/login", "/signup"];

  const isPublicPath = publicPaths.some(
    (path) => pathname === path || (path !== "/" && pathname.startsWith(path))
  );

  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For database sessions, check the session cookie
  const sessionToken =
    req.cookies.get("next-auth.session-token") ||
    req.cookies.get("__Secure-next-auth.session-token");

  if (sessionToken) {
    // User appears to be authenticated
    return NextResponse.next();
  }

    console.log("Session token found:", !!sessionToken);


  // Redirect to login if no session
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.href);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
