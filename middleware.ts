// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Define protected paths and allowed roles
    const protectedPaths = [
      { path: "/dashboard/admin", roles: ["Admin"] },
      { path: "/dashboard/doctor", roles: ["Doctor"] },
      { path: "/dashboard/nurse", roles: ["Nurse"] },
      { path: "/dashboard/receptionist", roles: ["Receptionist"] },
      { path: "/dashboard/pharmacist", roles: ["Pharmacist"] },
      { path: "/dashboard/patient", roles: ["Patient"] },
    ];

    // Check if the current path is protected
    for (const { path, roles } of protectedPaths) {
      if (pathname.startsWith(path)) {
        // Check if user has required role
        if (token?.role && !roles.includes(token.role)) {
          // Redirect to correct dashboard based on role
          switch (token.role) {
            case "Admin":
              return NextResponse.redirect(
                new URL("/dashboard/admin", req.url)
              );
            case "Doctor":
              return NextResponse.redirect(
                new URL("/dashboard/doctor", req.url)
              );
            case "Nurse":
              return NextResponse.redirect(
                new URL("/dashboard/nurse", req.url)
              );
            case "Receptionist":
              return NextResponse.redirect(
                new URL("/dashboard/receptionist", req.url)
              );
            case "Pharmacist":
              return NextResponse.redirect(
                new URL("/dashboard/pharmacist", req.url)
              );
            case "Patient":
              return NextResponse.redirect(
                new URL("/dashboard/patient", req.url)
              );
            default:
              return NextResponse.redirect(new URL("/", req.url));
          }
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
