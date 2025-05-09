// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { db } from "@/db";
import { users } from "@/db/schema/auth"; // Make sure the path is correct
import { eq } from "drizzle-orm";

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
          where: eq(users.username, credentials.username),
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
        // Perbaikan pertama: konversi null ke undefined untuk email
        return {
          id: foundUser.id.toString(),
          username: foundUser.username,
          role: foundUser.role,
          name: details?.name || undefined,
          email: details?.email || undefined, // Konversi null ke undefined
        };
      },
    }),
  ],
  callbacks: {
    // Perbaikan kedua: rename parameter user menjadi authUser untuk menghindari konflik
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
