// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    role: string;
    status: string;
    name?: string;
  }

  interface Session {
    user: User & {
      id: string;
      email: string;
      role: string;
      status: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    role: string;
    status: string;
    name?: string;
  }
}
