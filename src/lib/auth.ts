import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { polar, checkout, portal } from "@polar-sh/better-auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { polarClient } from "./polar";

export const auth = betterAuth({
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      prompt: "select_account",
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    facebook: {
      prompt: "select_account",
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),

  // Setup polar customer deletion when a user is deleted in our system
  user: {
    deleteUser: {
      enabled: true,
      afterDelete: async (user) => {
        await polarClient.customers.deleteExternal({
          externalId: user.id,
        });
      },
    },
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          successUrl: "/dashboard/upgrade",
          authenticatedUsersOnly: true,
        }),
        portal(),
      ],
    }),
  ],
});
