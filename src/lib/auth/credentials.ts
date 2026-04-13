type CredentialsInput = {
  username?: unknown;
  password?: unknown;
};

type ConfiguredCredential = {
  username: string;
  password: string;
};

const getConfiguredCredentials = (): ConfiguredCredential[] => {
  const candidates = [
    {
      username: process.env.AUTH_USER_1_USERNAME,
      password: process.env.AUTH_USER_1_PASSWORD,
    },
    {
      username: process.env.AUTH_USER_2_USERNAME,
      password: process.env.AUTH_USER_2_PASSWORD,
    },
  ];

  return candidates.filter(
    (candidate): candidate is ConfiguredCredential =>
      Boolean(candidate.username && candidate.password),
  );
};

export const areCredentialsValid = ({
  username,
  password,
}: CredentialsInput): boolean => {
  const configuredCredentials = getConfiguredCredentials();

  if (configuredCredentials.length === 0) {
    return false;
  }

  if (typeof username !== "string" || typeof password !== "string") {
    return false;
  }

  return configuredCredentials.some(
    (configured) =>
      username === configured.username && password === configured.password,
  );
};

