import "server-only";

type EntraClaims = {
  oid?: unknown;
  tid?: unknown;
  sub?: unknown;
};

export const buildExternalId = (claims: EntraClaims | null | undefined): string | null => {
  if (!claims) {
    return null;
  }

  const oid = typeof claims.oid === "string" ? claims.oid : null;
  const tid = typeof claims.tid === "string" ? claims.tid : null;
  const sub = typeof claims.sub === "string" ? claims.sub : null;

  if (oid && tid) {
    return `${oid}:${tid}`;
  }

  return sub ?? null;
};

export const getExternalIdFromAuthValue = (authValue: unknown): string | null => {
  const externalId = (authValue as { user?: { externalId?: unknown } } | null)?.user?.externalId;

  return typeof externalId === "string" && externalId.trim() !== "" ? externalId : null;
};

