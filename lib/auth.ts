import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { adminLoginSchema } from "@/lib/validation/order";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/account/sign-in"
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account?.provider === "credentials") {
        token.role = "ADMIN";
        token.adminUserId = user.id;
        token.parentUserId = undefined;
      }

      if (account?.provider === "google" || account?.provider === "apple") {
        const email = user?.email?.toLowerCase();
        if (email) {
          const parent = await prisma.parentUser.upsert({
            where: { email },
            update: {
              name: user.name ?? undefined,
              image: user.image ?? undefined,
              provider: account.provider,
              providerId: account.providerAccountId
            },
            create: {
              email,
              name: user.name ?? undefined,
              image: user.image ?? undefined,
              provider: account.provider,
              providerId: account.providerAccountId
            }
          });

          token.role = "PARENT";
          token.parentUserId = parent.id;
          token.adminUserId = undefined;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as string | undefined) ?? "PARENT";
        session.user.parentUserId = token.parentUserId as string | undefined;
        session.user.adminUserId = token.adminUserId as string | undefined;
      }
      return session;
    }
  },
  providers: [
    Credentials({
      id: "admin-credentials",
      name: "Admin Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = adminLoginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const admin = await prisma.adminUser.findUnique({
          where: { email: parsed.data.email.toLowerCase() }
        });

        if (!admin) {
          return null;
        }

        const matches = await bcrypt.compare(parsed.data.password, admin.passwordHash);
        if (!matches) {
          return null;
        }

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: "ADMIN"
        };
      }
    }),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET
          })
        ]
      : []),
    ...(env.AUTH_APPLE_ID && env.AUTH_APPLE_SECRET
      ? [
          Apple({
            clientId: env.AUTH_APPLE_ID,
            clientSecret: env.AUTH_APPLE_SECRET
          })
        ]
      : [])
  ]
});
