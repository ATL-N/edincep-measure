// import { withAuth } from "next-auth/middleware";
// import { NextResponse } from "next/server";

// export default withAuth(
//   // This function is only called if `authorized` returns `true`.
//   function middleware(req) {
//     const token = req.nextauth.token;
//     const { pathname } = req.nextUrl;

//     // If user is logged in, they shouldn't access login/signup
//     if (token && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
//         return NextResponse.redirect(new URL('/', req.url));
//     }

//     // Redirect logged-in users from the homepage to their dashboard
//     if (token && pathname === "/") {
//       if (token.role === "ADMIN") {
//         return NextResponse.redirect(new URL("/pages/admin/dashboard", req.url));
//       }
//       if (token.role === "DESIGNER") {
//         return NextResponse.redirect(new URL("/pages/dashboard", req.url));
//       }
//       if (token.role === "CLIENT") {
//         return NextResponse.redirect(new URL("/pages/clients/dashboard", req.url));
//       }
//       // Fallback for logged-in users with no specific role page
//       return NextResponse.redirect(new URL("/unauthorized", req.url));
//     }

//     // Protect routes based on role
//     if (pathname.startsWith("/pages/admin") && token?.role !== "ADMIN") {
//       return NextResponse.redirect(new URL("/unauthorized", req.url));
//     }

//     if (pathname.startsWith("/pages/dashboard") && token?.role !== "DESIGNER") {
//       return NextResponse.redirect(new URL("/unauthorized", req.url));
//     }

//     // Specific protection for client-related pages
//     if (pathname.startsWith("/pages/clients")) {
//       // /pages/clients/dashboard is only for CLIENTs
//       if (pathname.startsWith("/pages/clients/dashboard") && token?.role !== "CLIENT") {
//         return NextResponse.redirect(new URL("/unauthorized", req.url));
//       }
//       // Other /pages/clients/* routes are for DESIGNERs
//       if (!pathname.startsWith("/pages/clients/dashboard") && token?.role !== "DESIGNER") {
//         return NextResponse.redirect(new URL("/unauthorized", req.url));
//       }
//     }

//     return NextResponse.next();
//   },
//   {
//     callbacks: {
//       authorized: ({ req, token }) => {
//         const { pathname } = req.nextUrl;

//         // Public paths that are always accessible
//         const publicPaths = ["/login", "/signup", "/unauthorized"];
//         if (publicPaths.some(p => pathname.startsWith(p))) {
//           return true;
//         }

//         // The homepage is accessible to everyone (redirects happen in middleware)
//         if (pathname === "/") {
//           return true;
//         }

//         // For any other path, the user must be authenticated
//         return !!token;
//       },
//     },
//   }
// );

// export const config = {
//   matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
// };




// middleware.js
import { NextResponse } from "next/server";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

    console.log("Middleware running for:", pathname);


  // Define public paths
  const publicPaths = ["/login", "/signup", '/'];

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