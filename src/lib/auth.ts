import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env, isEmailDeliveryEnabled } from "@/env";
import { sendResetPasswordEmail, sendVerificationEmail } from "./email";
import { polarClient } from "./polar";
import { sendLifecycleEmail } from "@/server/billing/lifecycle-emails";
import { handleOrderPaid, handleSubscriptionEvent } from "@/server/billing/polar-sync";

// Keeps the local subscription cache and credit balance current. Registered
// only when POLAR_WEBHOOK_SECRET is set (endpoint: /api/auth/polar/webhooks).
const polarWebhooks = env.POLAR_WEBHOOK_SECRET
  ? [
      webhooks({
        secret: env.POLAR_WEBHOOK_SECRET,
        onSubscriptionCreated: (payload) => handleSubscriptionEvent(payload.data),
        onSubscriptionUpdated: (payload) => handleSubscriptionEvent(payload.data),
        onSubscriptionActive: (payload) => handleSubscriptionEvent(payload.data),
        onSubscriptionCanceled: (payload) => handleSubscriptionEvent(payload.data),
        onSubscriptionUncanceled: (payload) => handleSubscriptionEvent(payload.data),
        onSubscriptionRevoked: (payload) => handleSubscriptionEvent(payload.data),
        onOrderPaid: (payload) => handleOrderPaid(payload.data),
      }),
    ]
  : [];

const sendWelcome = (userId: string) =>
  sendLifecycleEmail(userId, "welcome", "signup").then(
    () => undefined,
    () => undefined,
  );

const facebookProvider =
  env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET
    ? {
        facebook: {
          clientId: env.FACEBOOK_CLIENT_ID,
          clientSecret: env.FACEBOOK_CLIENT_SECRET,
        },
      }
    : {};

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL, env.NEXT_PUBLIC_APP_URL],
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      prompt: "select_account",
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    ...facebookProvider,
  },
  account: {
    accountLinking: {
      enabled: true,
      // Only providers that guarantee verified emails may auto-link.
      trustedProviders: ["google", "github"],
    },
  },
  emailAndPassword: {
    enabled: true,
    // Enforced only when email delivery is configured, otherwise nobody
    // could finish sign-up. Configure RESEND_API_KEY + EMAIL_FROM in prod.
    requireEmailVerification: isEmailDeliveryEnabled,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail({ to: user.email, name: user.name, url });
    },
  },
  emailVerification: {
    afterEmailVerification: async (user) => sendWelcome(user.id),
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ to: user.email, name: user.name, url });
    },
  },
  rateLimit: {
    storage: "database",
    customRules: {
      "/request-password-reset": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),

  // Social sign-ups arrive verified; email sign-ups get it after verifying.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (user.emailVerified || !isEmailDeliveryEnabled) await sendWelcome(user.id);
        },
      },
    },
  },

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
          successUrl: "/dashboard/billing?checkout_id={CHECKOUT_ID}",
          returnUrl: "/dashboard/billing",
          authenticatedUsersOnly: true,
        }),
        portal(),
        ...polarWebhooks,
      ],
    }),
  ],
});
