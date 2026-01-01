// app/api/auth/[...nextauth]/route.js

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/app/lib/prisma.js";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// A helper function to create logs to keep the authorize function clean
async function createLog(data) {
  try {
    await prisma.log.create({ data });
  } catch (error) {
    // For production, you'd want more robust error handling here
    console.error("Failed to create log:", error);
  }
}

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
        login: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket.remoteAddress;
        const os = req.headers["user-agent"];
        const login = credentials?.login;

        if (!login || !credentials?.password) {
          throw new Error("Invalid credentials.");
        }

        // Check if the login identifier is an email or a phone number
        const isEmail = login.includes('@');
        
        const whereClause = isEmail ? { email: login } : { phone: login };

        const user = await prisma.user.findUnique({
          where: whereClause,
        });

        // Case 1: User not found or is soft-deleted
        if (!user || user.status === 'DELETED' || !user.hashedPassword) {
          await createLog({
            action: "LOGIN_FAILED_USER_NOT_FOUND_OR_INACTIVE",
            ipAddress: ip,
            os: os,
            details: { login },
          });
          throw new Error("Invalid credentials.");
        }

        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        // Case 2: Incorrect password
        if (!isPasswordCorrect) {
          await createLog({
            userId: user.id,
            action: "LOGIN_FAILED_WRONG_PASSWORD",
            ipAddress: ip,
            os: os,
            details: { login },
          });
          throw new Error("Invalid credentials.");
        }

        // Case 3: Successful login
        await createLog({
          userId: user.id,
          action: "USER_LOGIN_SUCCESS",
          ipAddress: ip,
          os: os,
        });

        return user;
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account }) {
      // For credentials provider, the authorization is already handled in the 'authorize' function.
      if (account.provider === "credentials") {
        return true;
      }

      // For OAuth providers, we need to check if the user is allowed to sign in.
      if (user && user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // If the user already exists in the DB, check their status.
        if (dbUser && dbUser.status === 'DELETED') {
          // Returning false will prevent the user from signing in.
          return false;
        }
      }
      
      // If it's a new user or an existing active user, allow the sign-in.
      return true;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.clientId = token.clientId;
        session.user.measurementUnit = token.measurementUnit; // <-- Add to session
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { clientProfile: true },
        });
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.status = dbUser.status;
        token.measurementUnit = dbUser.measurementUnit; // <-- Add to token
        if (dbUser.clientProfile) {
          token.clientId = dbUser.clientProfile.id;
        }
      }
      return token;
    },
  },

  // Events block to capture all logins (including Google OAuth)
  events: {
    async signIn(message) {
      if (message.user) {
        // Different approaches to get IP and User-Agent in events callback
        let ip = "unknown";
        let os = "unknown";

        // Try to get from various possible locations
        if (message.request) {
          // For Next.js App Router
          ip =
            message.request.headers?.get?.("x-forwarded-for") ||
            message.request.headers?.get?.("x-real-ip") ||
            message.request.headers?.get?.("cf-connecting-ip") ||
            message.request.ip ||
            message.request.connection?.remoteAddress ||
            "unknown";

          os = message.request.headers?.get?.("user-agent") || "unknown";

          // If the above doesn't work, try direct property access
          if (ip === "unknown" && message.request.headers) {
            ip =
              message.request.headers["x-forwarded-for"] ||
              message.request.headers["x-real-ip"] ||
              message.request.headers["cf-connecting-ip"] ||
              "unknown";
          }

          if (os === "unknown" && message.request.headers) {
            os = message.request.headers["user-agent"] || "unknown";
          }
        }

        // Only log if this is a Google OAuth login (credentials login is already logged in authorize)
        if (message.account?.provider === "google") {
          await createLog({
            userId: message.user.id,
            action: "USER_LOGIN_SUCCESS",
            ipAddress: ip,
            os: os,
          });
        }
      }
    },
  },

  pages: {
    signIn: "/login",
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
