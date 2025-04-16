import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import { PrismaClient, Role } from "@prisma/client";
import { verifyCredentials } from "../../../services/auth";

// Initialize Prisma client for OAuth user handling
const prisma = new PrismaClient();

// Define types for the user object
type UserType = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: Role;
};

export const authOptions: AuthOptions = {
  // We'll handle the OAuth users manually with JWT strategy
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const result = await verifyCredentials({
          email: credentials.email,
          password: credentials.password,
        });

        if (!result.success || !result.user) {
          return null;
        }

        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          image: result.user.image,
          role: result.user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: Role.USER, // Default role for OAuth users
        };
      },
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          role: Role.USER, // Default role for OAuth users
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Save the provider info on the token when signing in
      if (user) {
        token.id = user.id;
        token.role = (user as UserType).role;
        
        if (account) {
          token.provider = account.provider;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth sign-ins, ensure user has required database entries
      if (account && (account.provider === "google" || account.provider === "github") && user.email) {
        try {
          // Check if the user already exists
          let dbUser = await prisma.user.findUnique({
            where: { email: user.email }
          });
          
          // If the user doesn't exist, create them
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: user.image,
                role: Role.USER,
              },
            });
            
            console.log(`Created new user from ${account.provider} OAuth:`, user.email);
          } else {
            // Update existing user with latest OAuth info
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                name: user.name || dbUser.name,
                image: user.image || dbUser.image,
              }
            });
          }
          
          // Link the OAuth account to the user if not already linked
          const existingAccount = await prisma.account.findFirst({
            where: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            }
          });
          
          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              }
            });
            
            console.log(`Linked ${account.provider} account for user:`, user.email);
          }
        } catch (error) {
          console.error("Error handling OAuth sign-in:", error);
          return false;
        }
      }
      return true;
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
    },
    async signOut({ session }) {
      if (session?.user?.email) {
        console.log(`User signed out: ${session.user.email}`);
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 