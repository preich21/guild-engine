import "server-only";

type EntraProviderConfig = {
  clientId: string;
  clientSecret: string;
  issuer: string;
};

const getEntraEnv = (): EntraProviderConfig | null => {
  const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID;
  const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET;
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER;

  if (!clientId || !clientSecret || !issuer) {
    return null;
  }

  return { clientId, clientSecret, issuer };
};

export const getEntraProviderConfig = (): EntraProviderConfig | null => getEntraEnv();

export const isEntraConfigured = (): boolean => Boolean(getEntraEnv());

