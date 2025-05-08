// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
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
        const user = await db.query.users.findFirst({
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

        if (!user) {
          return null;
        }

        // Verifikasi password
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          return null;
        }

        // Ambil data detail sesuai role
        let details;
        switch (user.role) {
          case "Admin":
            details = user.adminDetails;
            break;
          case "Doctor":
            details = user.doctorDetails;
            break;
          case "Nurse":
            details = user.nurseDetails;
            break;
          case "Receptionist":
            details = user.receptionistDetails;
            break;
          case "Pharmacist":
            details = user.pharmacistDetails;
            break;
          case "Patient":
            details = user.patientDetails;
            break;
        }

        // Return user untuk dimasukkan ke JWT token
        return {
          id: user.id.toString(),
          username: user.username,
          role: user.role,
          name: details?.name,
          email: details?.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.name = user.name;
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
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
