// middleware.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  console.log("Middleware running for:", pathname);

  // Define paths that should always be accessible (no auth required)
  const publicPaths = [
    "/login",
    "/signup",
    "/unauthorized",
    "/api/auth", // Important: exclude all auth API routes
    "/measurements/fill", // Allow public access to the client form
    "/api/measurements/share", // Allow public access to the share API
  ];

  // Check if current path is public
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Always allow public paths without any checks
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Get the session token using next-auth's getToken method
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  console.log("Session token found:", !!token);

  // Handle homepage ("/")
  if (pathname === "/") {
    if (token) {
      // Redirect authenticated users to their respective dashboards
      if (token.role === "ADMIN") {
        return NextResponse.redirect(new URL("/pages/admin/dashboard", req.url));
      }
      if (token.role === "DESIGNER") {
        return NextResponse.redirect(new URL("/pages/dashboard", req.url));
      }
      if (token.role === "CLIENT") {
        return NextResponse.redirect(new URL("/pages/client/dashboard", req.url));
      }
      // Fallback for authenticated users without a recognized role
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    // Allow unauthenticated users to view homepage
    return NextResponse.next();
  }

  // If user is not authenticated and trying to access protected routes
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    // Only add callbackUrl if it's not already a login/signup page to prevent loops
    if (!pathname.startsWith("/login") && !pathname.startsWith("/signup")) {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control for authenticated users
  
  // Admin routes
  if (pathname.startsWith("/pages/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Designer routes (main dashboard)
  if (pathname.startsWith("/pages/dashboard") && token.role !== "DESIGNER") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Client-specific routes
  if (pathname.startsWith("/pages/client")) {
    // Only clients can access client dashboard
    if (pathname.startsWith("/pages/client/dashboard") && token.role !== "CLIENT") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Designer managing clients routes
  if (pathname.startsWith("/pages/clients") && !pathname.startsWith("/pages/client/dashboard")) {
    // Only designers can manage clients
    if (token.role !== "DESIGNER" && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth/* (authentication API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml (meta files)
     * - *.png, *.jpg, *.jpeg, *.gif, *.svg, *.webp (image files)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webp$).*)",
  ],
};