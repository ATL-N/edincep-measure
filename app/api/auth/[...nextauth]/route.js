// app/api/auth/[...nextauth]/route.js

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient, Role } from "@prisma/client";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.image,
          role: profile.email.endsWith("@yourfashioncompany.com")
            ? Role.DESIGNER
            : Role.DESIGNER,
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials.");
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.hashedPassword) {
          throw new Error("Invalid credentials.");
        }
        // Check if the user is soft-deleted
        if (user.status === "DELETED") {
          throw new Error("Your account has been deactivated.");
        }
        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );
        if (!isPasswordCorrect) {
          throw new Error("Invalid credentials.");
        }
        return user;
      },
    }),
  ],

  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    // For database sessions, we need to fetch the user data from the database
    async session({ session, user }) {
      if (session?.user && user) {
        // The 'user' parameter contains the full user object from the database
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.status = user.status; // Include user status
      }
      return session;
    },

    // This callback runs when a user signs in
    async signIn({ user, account, profile }) {
      // You can add any additional logic here if needed
      return true;
    },
  },

  // jwt: {
  //   encode: async function (params) {
  //     if (params.token?.credentials) {
  //       const sessionToken = uuid();

  //       if (!params.token.sub) {
  //         throw new Error("No user ID found in token");
  //       }

  //       const createdSession = await adapter?.createSession?.({
  //         sessionToken: sessionToken,
  //         userId: params.token.sub,
  //         expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  //       });

  //       if (!createdSession) {
  //         throw new Error("Failed to create session");
  //       }

  //       return sessionToken;
  //     }
  //     return defaultEncode(params);
  //   },
  // },

  pages: {
    signIn: "/login",
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
