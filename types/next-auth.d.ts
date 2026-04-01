import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role?: string;
      name?: string | null;
      email?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}
