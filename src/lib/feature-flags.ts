import featureConfiguration from "@/config/feature-configuration.json";

export type FeatureConfigValue = boolean | number | string;

export type FeatureConfigState = Record<
  string,
  {
    enabled: boolean;
    settings: Record<string, FeatureConfigValue>;
  }
>;

type CatalogSetting = {
  id: string;
  type: "checkbox" | "date" | "decimal" | "number" | "select" | "switch";
  defaultValue?: FeatureConfigValue;
  min?: number;
  options?: Array<{ value: string }>;
};

type RequirementCondition =
  | { featureEnabled: string }
  | { settingEnabled: { featureId: string; settingId: string } }
  | { all: RequirementCondition[] }
  | { any: RequirementCondition[] }
  | { not: RequirementCondition };

type Requirement = {
  condition: RequirementCondition;
};

type CatalogFeature = {
  id: string;
  defaultEnabled?: boolean;
  prerequisites?: Requirement[];
  configuration?: CatalogSetting[];
};

type Catalog = {
  features: CatalogFeature[];
};

const catalog = featureConfiguration as Catalog;

const getSettingDefaultValue = (setting: CatalogSetting): FeatureConfigValue => {
  if (setting.defaultValue !== undefined) {
    return setting.defaultValue;
  }

  if (setting.type === "checkbox" || setting.type === "switch") {
    return false;
  }

  if (setting.type === "number" || setting.type === "decimal") {
    return setting.min ?? 0;
  }

  if (setting.type === "select") {
    return setting.options?.[0]?.value ?? "";
  }

  return "";
};

export const getDefaultFeatureConfigState = (): FeatureConfigState =>
  Object.fromEntries(
    catalog.features.map((feature) => [
      feature.id,
      {
        enabled: feature.defaultEnabled ?? false,
        settings: Object.fromEntries(
          (feature.configuration ?? []).map((setting) => [setting.id, getSettingDefaultValue(setting)]),
        ),
      },
    ]),
  );

export const mergeFeatureConfigState = (
  defaults: FeatureConfigState,
  savedState: FeatureConfigState | null | undefined,
): FeatureConfigState => {
  if (!savedState) {
    return defaults;
  }

  return Object.fromEntries(
    Object.entries(defaults).map(([featureId, defaultFeature]) => [
      featureId,
      {
        enabled: savedState[featureId]?.enabled ?? defaultFeature.enabled,
        settings: {
          ...defaultFeature.settings,
          ...(savedState[featureId]?.settings ?? {}),
        },
      },
    ]),
  );
};

const evaluateRequirementCondition = (
  condition: RequirementCondition,
  state: FeatureConfigState,
): boolean => {
  if ("featureEnabled" in condition) {
    return state[condition.featureEnabled]?.enabled;
  }

  if ("settingEnabled" in condition) {
    const { featureId, settingId } = condition.settingEnabled;
    return (state[featureId]?.enabled && state[featureId]?.settings[settingId] === true);
  }

  if ("all" in condition) {
    return condition.all.every((child) => evaluateRequirementCondition(child, state));
  }

  if ("any" in condition) {
    return condition.any.some((child) => evaluateRequirementCondition(child, state));
  }

  return !evaluateRequirementCondition(condition.not, state);
};

const areFeaturePrerequisitesMet = (
  feature: CatalogFeature,
  state: FeatureConfigState,
) =>
  (feature.prerequisites ?? []).every((requirement) =>
    evaluateRequirementCondition(requirement.condition, state),
  );

export const applyFeaturePrerequisites = (
  state: FeatureConfigState,
): FeatureConfigState => {
  let effectiveState = state;
  let changed = true;

  while (changed) {
    changed = false;
    effectiveState = Object.fromEntries(
        catalog.features.map((feature) => {
          const currentFeature = effectiveState[feature.id] ?? {
            enabled: false,
            settings: {},
          };
          const nextEnabled =
              currentFeature.enabled && areFeaturePrerequisitesMet(feature, effectiveState);

          if (nextEnabled !== currentFeature.enabled) {
            changed = true;
          }

          return [
            feature.id,
            {
              ...currentFeature,
              enabled: nextEnabled,
            },
          ];
        }),
    );
  }

  return effectiveState;
};

export const isFeatureEnabled = (state: FeatureConfigState, featureId: string) =>
  state[featureId]?.enabled;

export const getFeatureSettingValue = (
  state: FeatureConfigState,
  featureId: string,
  settingId: string,
) => state[featureId]?.settings[settingId];

export const isFeatureSettingEnabled = (
  state: FeatureConfigState,
  featureId: string,
  settingId: string,
) => getFeatureSettingValue(state, featureId, settingId) === true;

export const isProtocolRaffleEnabled = (state: FeatureConfigState) =>
  isFeatureEnabled(state, "minigames") &&
  (isFeatureSettingEnabled(state, "minigames", "protocol-raffle") ||
    isFeatureSettingEnabled(state, "minigames", "one-time-doing-raffle"));

export const getDefaultEnabledUserPath = (lang: string, state: FeatureConfigState) => {
  if (isFeatureEnabled(state, "individual-leaderboard")) {
    return `/${lang}/leaderboard/individual`;
  }

  if (isFeatureEnabled(state, "team-leaderboard")) {
    return `/${lang}/leaderboard/team`;
  }

  if (isFeatureEnabled(state, "point-system")) {
    return `/${lang}/get-points`;
  }

  if (isProtocolRaffleEnabled(state)) {
    return `/${lang}/protocol-raffle`;
  }

  return `/${lang}/rules`;
};

const isPathOrChild = (pathname: string, targetPath: string) =>
  pathname === targetPath || pathname.startsWith(`${targetPath}/`);

export const isRouteEnabled = (
  pathname: string,
  lang: string,
  state: FeatureConfigState,
) => {
  if (isPathOrChild(pathname, `/${lang}/leaderboard/individual`)) {
    return isFeatureEnabled(state, "individual-leaderboard");
  }

  if (isPathOrChild(pathname, `/${lang}/leaderboard/team`)) {
    return isFeatureEnabled(state, "team-leaderboard");
  }

  if (pathname === `/${lang}/leaderboard`) {
    return (
      isFeatureEnabled(state, "individual-leaderboard") ||
      isFeatureEnabled(state, "team-leaderboard")
    );
  }

  if (isPathOrChild(pathname, `/${lang}/get-points`)) {
    return isFeatureEnabled(state, "point-system");
  }

  if (isPathOrChild(pathname, `/${lang}/protocol-raffle`)) {
    return isProtocolRaffleEnabled(state);
  }

  if (isPathOrChild(pathname, `/${lang}/admin/point-distribution`)) {
    return isFeatureEnabled(state, "point-system");
  }

  if (isPathOrChild(pathname, `/${lang}/admin/manual-points`)) {
    return isFeatureEnabled(state, "point-system");
  }

  if (
    isPathOrChild(pathname, `/${lang}/admin/achievements`) ||
    isPathOrChild(pathname, `/${lang}/admin/award-achievements`)
  ) {
    return isFeatureEnabled(state, "badges");
  }

  return true;
};
