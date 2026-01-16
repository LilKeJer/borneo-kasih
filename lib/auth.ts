// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { db } from "@/db";
import { users } from "@/db/schema/auth"; // Make sure the path is correct
import { and, eq, isNull } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Cari user berdasarkan username
        const foundUser = await db.query.users.findFirst({
          where: and(
            eq(users.username, credentials.username),
            isNull(users.deletedAt)
          ),
          with: {
            adminDetails: true,
            doctorDetails: true,
            nurseDetails: true,
            receptionistDetails: true,
            pharmacistDetails: true,
            patientDetails: true,
          },
        });

        if (!foundUser) {
          return null;
        }

        // Verifikasi password
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          foundUser.password
        );

        if (!passwordMatch) {
          return null;
        }

        // Check user status
        if (foundUser.role === "Patient" && foundUser.status === "Pending") {
          throw new Error("Akun Anda sedang menunggu verifikasi admin");
        }

        if (foundUser.status === "Rejected") {
          throw new Error("Akun Anda ditolak");
        }

        if (
          foundUser.status === "Suspended" ||
          foundUser.status === "Inactive"
        ) {
          throw new Error("Akun Anda tidak aktif");
        }

        // Ambil data detail sesuai role
        let details;
        switch (foundUser.role) {
          case "Admin":
            details = foundUser.adminDetails;
            break;
          case "Doctor":
            details = foundUser.doctorDetails;
            break;
          case "Nurse":
            details = foundUser.nurseDetails;
            break;
          case "Receptionist":
            details = foundUser.receptionistDetails;
            break;
          case "Pharmacist":
            details = foundUser.pharmacistDetails;
            break;
          case "Patient":
            details = foundUser.patientDetails;
            break;
        }

        // Return user untuk dimasukkan ke JWT token
        return {
          id: foundUser.id.toString(),
          username: foundUser.username,
          role: foundUser.role,
          status: foundUser.status,
          name: details?.name || undefined,
          email: details?.email || undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user: authUser }) {
      if (authUser) {
        token.id = authUser.id;
        token.role = authUser.role;
        token.username = authUser.username;
        token.name = authUser.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.username = token.username;
      }
      return session;
    },
  },
};
