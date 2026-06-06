// middleware.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "https://app.edinmeasure.edinception.com",
    "https://edinmeasure.edinception.com",
    "http://localhost:8000",
    "http://localhost:7000",
    "http://127.0.0.1:8000",
    "http://192.168.0.84:8000",
  ];

  console.log(`Middleware: ${req.method} ${pathname} | Origin: ${origin}`);

  // 1. Handle CORS Preflight (OPTIONS)
  if (req.method === "OPTIONS" && pathname.startsWith("/api")) {
    const response = new NextResponse(null, { status: 204 });
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS,PATCH",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
      );
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Max-Age", "86400");
    }
    return response;
  }

  // 2. Define public paths
  const publicPaths = [
    "/login",
    "/signup",
    "/unauthorized",
    "/api/auth",
    "/measurements/fill",
    "/api/measurements/share",
  ];

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // 3. Authorization Logic
  let response;

  if (isPublicPath) {
    response = NextResponse.next();
  } else {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (pathname === "/") {
      if (token) {
        if (token.role === "ADMIN")
          return NextResponse.redirect(
            new URL("/pages/admin/dashboard", req.url),
          );
        if (token.role === "DESIGNER")
          return NextResponse.redirect(new URL("/pages/dashboard", req.url));
        if (token.role === "CLIENT")
          return NextResponse.redirect(
            new URL("/pages/client/dashboard", req.url),
          );
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      response = NextResponse.next();
    } else if (!token) {
      const loginUrl = new URL("/login", req.url);
      if (!pathname.startsWith("/login") && !pathname.startsWith("/signup")) {
        loginUrl.searchParams.set("callbackUrl", pathname);
      }
      return NextResponse.redirect(loginUrl);
    } else {
      // Role-based checks
      if (pathname.startsWith("/pages/admin") && token.role !== "ADMIN")
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      if (pathname.startsWith("/pages/dashboard") && token.role !== "DESIGNER")
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      if (
        pathname.startsWith("/pages/client/dashboard") &&
        token.role !== "CLIENT"
      )
        return NextResponse.redirect(new URL("/unauthorized", req.url));

      response = NextResponse.next();
    }
  }

  // 4. Apply CORS headers to ALL API responses
  if (
    pathname.startsWith("/api") &&
    origin &&
    allowedOrigins.includes(origin)
  ) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS,PATCH",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webp$).*)",
  ],
};
