import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import { areCredentialsValid } from "@/lib/auth/credentials";
import { getEntraProviderConfig } from "@/lib/auth/entra";
import { buildExternalId } from "@/lib/auth/external-id";

const providers: Provider[] = [
  Credentials({
    credentials: {
      username: { label: "username", type: "text" },
      password: { label: "password", type: "password" },
    },
    authorize: async (credentials) => {
      if (!areCredentialsValid(credentials)) {
        return null;
      }

      return {
        id: "credentials-user",
        name: String(credentials?.username),
      };
    },
  }),
];

const entraConfig = getEntraProviderConfig();

if (entraConfig) {
  providers.push(MicrosoftEntraID(entraConfig));
}

export const { handlers, auth, signIn, signOut, unstable_update: updateSession } = NextAuth({
  providers,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, trigger, session, account, profile }) {
      if (account?.provider === "microsoft-entra-id") {
        const externalId = buildExternalId(profile as { oid?: unknown; tid?: unknown; sub?: unknown } | null);

        if (externalId) {
          token.externalId = externalId;
        }
      }

      const updatedName = session?.user?.name;

      if (trigger === "update" && typeof updatedName === "string") {
        token.name = updatedName;
      }

      return token;
    },
    session({ session, token }) {
      const externalId = token.externalId;

      if (typeof externalId === "string") {
        if (!session.user) {
          session.user = {};
        }

        (session.user as { externalId?: string }).externalId = externalId;
      }

      return session;
    },
  },
});
