// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // Import from the separate file

// Create and export the handler functions only
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
