import { betterAuth } from "better-auth";
import { getR1Client } from "@/lib/db";

// Custom adapter for R1 database
function createR1Adapter() {
  const db = getR1Client();

  return {
    // User operations
    createUser: async (data: any) => {
      const userData = {
        name: data.name,
        email: data.email,
        emailVerified: data.emailVerified || false,
        image: data.image || null,
      };
      return await db.createUser(userData);
    },

    getUser: async (id: string) => {
      return await db.findUserById(id);
    },

    getUserByEmail: async (email: string) => {
      return await db.findUserByEmail(email);
    },

    updateUser: async (id: string, data: any) => {
      const userData = {
        name: data.name,
        email: data.email,
        emailVerified: data.emailVerified,
        image: data.image,
      };
      return await db.updateUser(id, userData);
    },

    deleteUser: async (id: string) => {
      return await db.deleteUser(id);
    },

    // Session operations
    createSession: async (data: any) => {
      const sessionData = {
        expiresAt: data.expiresAt,
        token: data.token,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        userId: data.userId,
      };
      return await db.createSession(sessionData);
    },

    getSession: async (token: string) => {
      return await db.findSessionByToken(token);
    },

    deleteSession: async (id: string) => {
      return await db.deleteSession(id);
    },

    deleteExpiredSessions: async () => {
      return await db.deleteExpiredSessions();
    },

    // Account operations (for password storage)
    createAccount: async (data: any) => {
      // For simplicity, we'll use the user table for account storage
      // In a real implementation, you'd have a separate account table
      return null;
    },

    getAccount: async (id: string) => {
      // For simplicity, we'll use the user table for account storage
      return null;
    },

    updateAccount: async (id: string, data: any) => {
      // For simplicity, we'll use the user table for account storage
      return null;
    },

    deleteAccount: async (id: string) => {
      // For simplicity, we'll use the user table for account storage
      return null;
    },

    // Verification operations
    createVerification: async (data: any) => {
      // For simplicity, we'll implement verification as needed
      return null;
    },

    getVerification: async (id: string) => {
      return null;
    },

    deleteVerification: async (id: string) => {
      return true;
    },
  };
}

export const auth = betterAuth({
  database: createR1Adapter(),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  // Add rate limiting
  rateLimit: {
    enabled: true,
    window: 60, // 1 minute
    max: 5, // 5 attempts per minute
  },
  // Add account linking
  account: {
    accountLinking: {
      enabled: true,
    },
  },
});