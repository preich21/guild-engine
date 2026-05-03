"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";

import {
  saveFeatureConfig,
  type FeatureConfigPerformanceMetric,
  type LoadedFeatureConfig,
} from "@/app/[lang]/admin/feature-config/actions";
import { useFeatureConfig } from "@/components/feature-config-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Locale } from "@/i18n/config";
import { applyFeaturePrerequisites, normalizeHomePagePath } from "@/lib/feature-flags";

type LocalizedText = Record<Locale, string>;

type RequirementCondition =
  | { featureEnabled: string }
  | { settingEnabled: { featureId: string; settingId: string } }
  | { all: RequirementCondition[] }
  | { any: RequirementCondition[] }
  | { not: RequirementCondition };

type Requirement = {
  message?: LocalizedText;
  tooltip?: LocalizedText;
  condition: RequirementCondition;
};

export type FieldValue = boolean | number | string | number[];

type FeatureSetting = {
  id: string;
  type:
    | "checkbox"
    | "date"
    | "decimal"
    | "number"
    | "performance-metric-select"
    | "select"
    | "string"
    | "streak-valid-values"
    | "switch";
  label: LocalizedText;
  description?: LocalizedText;
  defaultValue?: FieldValue;
  min?: number;
  step?: number;
  parentSettingId?: string;
  options?: Array<{
    value: string;
    label: LocalizedText;
  }>;
  dependsOnSettingId?: string;
  prerequisites?: Requirement[];
};

type FeatureDefinition = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  defaultEnabled?: boolean;
  prerequisites?: Requirement[];
  configuration?: FeatureSetting[];
};

export type FeatureCatalog = {
  features: FeatureDefinition[];
};

export type FeatureState = Record<
  string,
  {
    enabled: boolean;
    settings: Record<string, FieldValue>;
  }
>;

type FeatureConfigurationFormProps = {
  lang: Locale;
  catalog: FeatureCatalog;
  dictionary: {
    prerequisitesLabel: string;
    configurationLabel: string;
    lastEditedLabel: string;
    editedByLabel: string;
    never: string;
    notAvailable: string;
    cancelButton: string;
    saveButton: string;
    saveSuccess: string;
    saveError: string;
    selectPlaceholder: string;
    disabledUntilFeatureEnabled: string;
    homePageTitle: string;
    homePageDescription: string;
    homePageLabel: string;
    homePagePrefix: string;
    homePagePlaceholder: string;
  };
  initialLoadedConfig: LoadedFeatureConfig;
  performanceMetrics: FeatureConfigPerformanceMetric[];
};

const getSettingDefaultValue = (setting: FeatureSetting): FieldValue => {
  if (setting.defaultValue !== undefined) {
    return setting.defaultValue;
  }

  if (setting.type === "checkbox" || setting.type === "switch") {
    return false;
  }

  if (setting.type === "number" || setting.type === "decimal") {
    return setting.min ?? 0;
  }

  if (setting.type === "streak-valid-values") {
    return [];
  }

  if (setting.type === "select") {
    return setting.options?.[0]?.value ?? "";
  }

  return "";
};

const buildInitialState = (features: FeatureDefinition[]): FeatureState =>
  Object.fromEntries(
    features.map((feature) => [
      feature.id,
      {
        enabled: feature.defaultEnabled ?? false,
        settings: Object.fromEntries(
          (feature.configuration ?? []).map((setting) => [setting.id, getSettingDefaultValue(setting)]),
        ),
      },
    ]),
  );

const mergeFeatureState = (
  defaults: FeatureState,
  savedState: FeatureState | null,
): FeatureState => {
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

const evaluateCondition = (condition: RequirementCondition, state: FeatureState): boolean => {
  if ("featureEnabled" in condition) {
    return state[condition.featureEnabled]?.enabled;
  }

  if ("settingEnabled" in condition) {
    const { featureId, settingId } = condition.settingEnabled;
    return state[featureId]?.settings[settingId] === true;
  }

  if ("all" in condition) {
    return condition.all.every((child) => evaluateCondition(child, state));
  }

  if ("any" in condition) {
    return condition.any.some((child) => evaluateCondition(child, state));
  }

  return !evaluateCondition(condition.not, state);
};

const getFirstUnmetRequirement = (requirements: Requirement[] | undefined, state: FeatureState) =>
  requirements?.find((requirement) => !evaluateCondition(requirement.condition, state));

const localize = (text: LocalizedText, lang: Locale) => text[lang] ?? text.en;

const splitEnumPossibilities = (value: string | null | undefined) =>
  (value ?? "")
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");

function DisabledTooltip({
  children,
  content,
}: {
  children: ReactNode;
  content?: string;
}) {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex w-fit" />}>{children}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}

export function FeatureConfigurationForm({
  lang,
  catalog,
  dictionary,
  initialLoadedConfig,
  performanceMetrics,
}: FeatureConfigurationFormProps) {
  const router = useRouter();
  const globalFeatureConfig = useFeatureConfig();
  const defaultState = useMemo(() => buildInitialState(catalog.features), [catalog.features]);
  const initialState = useMemo(
    () => mergeFeatureState(defaultState, initialLoadedConfig.state),
    [defaultState, initialLoadedConfig.state],
  );
  const [loadedState, setLoadedState] = useState<FeatureState>(initialState);
  const [featureState, setFeatureState] = useState<FeatureState>(initialState);
  const [loadedHomePagePath, setLoadedHomePagePath] = useState(initialLoadedConfig.homePagePath ?? "");
  const [homePagePath, setHomePagePath] = useState(initialLoadedConfig.homePagePath ?? "");
  const [metadata, setMetadata] = useState({
    timestamp: initialLoadedConfig.timestamp,
    modifyingUsername: initialLoadedConfig.modifyingUsername,
  });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const serializedLoadedState = useMemo(() => JSON.stringify(loadedState), [loadedState]);
  const hasChanges =
    JSON.stringify(featureState) !== serializedLoadedState ||
    normalizeHomePagePath(homePagePath) !== normalizeHomePagePath(loadedHomePagePath);

  const formattedTimestamp = useMemo(() => {
    if (!metadata.timestamp) {
      return dictionary.never;
    }

    const parsed = new Date(metadata.timestamp);

    if (Number.isNaN(parsed.getTime())) {
      return metadata.timestamp;
    }

    return new Intl.DateTimeFormat(lang, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  }, [dictionary.never, lang, metadata.timestamp]);

  const performanceMetricsById = useMemo(
    () => new Map(performanceMetrics.map((metric) => [metric.id, metric])),
    [performanceMetrics],
  );

  const updateFeatureEnabled = (featureId: string, enabled: boolean) => {
    setFeatureState((current) => ({
      ...current,
      [featureId]: {
        ...current[featureId],
        enabled,
      },
    }));
    setStatus("idle");
  };

  const updateSetting = (featureId: string, settingId: string, value: FieldValue) => {
    setFeatureState((current) => ({
      ...current,
      [featureId]: {
        ...current[featureId],
        settings: {
          ...current[featureId].settings,
          [settingId]: value,
        },
      },
    }));
    setStatus("idle");
  };

  const updateSettingWithDependents = (
    feature: FeatureDefinition,
    settingId: string,
    value: FieldValue,
  ) => {
    setFeatureState((current) => {
      const currentFeature = current[feature.id];
      const nextSettings = {
        ...currentFeature.settings,
        [settingId]: value,
      };

      for (const dependentSetting of feature.configuration ?? []) {
        if (dependentSetting.dependsOnSettingId === settingId) {
          const metric = typeof value === "string" ? performanceMetricsById.get(value) : undefined;
          nextSettings[dependentSetting.id] = metric?.type === 0 ? [] : getSettingDefaultValue(dependentSetting);
        }
      }

      return {
        ...current,
        [feature.id]: {
          ...currentFeature,
          settings: nextSettings,
        },
      };
    });
    setStatus("idle");
  };

  const hasInvalidEnabledSettings = catalog.features.some((feature) => {
    if (!featureState[feature.id]?.enabled) {
      return false;
    }

    return (feature.configuration ?? []).some((setting) => {
      if (setting.type !== "streak-valid-values") {
        return false;
      }

      const metricId = setting.dependsOnSettingId
        ? featureState[feature.id]?.settings[setting.dependsOnSettingId]
        : undefined;
      const metric = typeof metricId === "string" ? performanceMetricsById.get(metricId) : undefined;
      const value = featureState[feature.id]?.settings[setting.id] ?? getSettingDefaultValue(setting);

      return metric?.type === 0 && (!Array.isArray(value) || value.length === 0);
    });
  });

  const handleSave = () => {
    setStatus("idle");

    startTransition(async () => {
      const result = await saveFeatureConfig(lang, featureState, homePagePath);

      if (result.status === "success") {
        const nextLoadedState = mergeFeatureState(defaultState, result.entry.state);
        const nextHomePagePath = result.entry.homePagePath ?? "";
        setLoadedState(nextLoadedState);
        setFeatureState(nextLoadedState);
        setLoadedHomePagePath(nextHomePagePath);
        setHomePagePath(nextHomePagePath);
        setMetadata({
          timestamp: result.entry.timestamp,
          modifyingUsername: result.entry.modifyingUsername,
        });
        globalFeatureConfig.setState(applyFeaturePrerequisites(nextLoadedState));
        setStatus("success");
        router.refresh();
        return;
      }

      setStatus("error");
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="grid gap-4">
          {catalog.features.map((feature) => {
            const unmetFeatureRequirement = getFirstUnmetRequirement(feature.prerequisites, featureState);
            const isFeatureDisabled = Boolean(unmetFeatureRequirement);
            const featureEnabled = featureState[feature.id]?.enabled;

            return (
              <Card key={feature.id} className="rounded-lg">
                <CardHeader className="gap-3">
                  <div className="flex items-start gap-3">
                    <DisabledTooltip
                      content={
                        isFeatureDisabled && unmetFeatureRequirement?.tooltip
                          ? localize(unmetFeatureRequirement.tooltip, lang)
                          : undefined
                      }
                    >
                      <Switch
                        checked={featureEnabled}
                        disabled={isFeatureDisabled}
                        onCheckedChange={(checked) => updateFeatureEnabled(feature.id, checked)}
                        aria-label={localize(feature.name, lang)}
                        className="mt-0.5"
                      />
                    </DisabledTooltip>
                    <div className="min-w-0 space-y-1">
                      <CardTitle>{localize(feature.name, lang)}</CardTitle>
                      <CardDescription>{localize(feature.description, lang)}</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                {(feature.prerequisites?.length ?? 0) > 0 || (feature.configuration?.length ?? 0) > 0 ? (
                  <CardContent className="space-y-4">
                    {(feature.prerequisites?.length ?? 0) > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{dictionary.prerequisitesLabel}</p>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {feature.prerequisites?.map((requirement, index) =>
                            requirement.message ? (
                              <li key={`${feature.id}-requirement-${index}`}>
                                {localize(requirement.message, lang)}
                              </li>
                            ) : null,
                          )}
                        </ul>
                      </div>
                    ) : null}

                    {(feature.configuration?.length ?? 0) > 0 ? (
                      <div className="grid gap-4 grid-cols-2">
                        <p className="text-sm font-medium col-span-2">{dictionary.configurationLabel}</p>
                        {feature.configuration
                          ?.filter((setting) => !setting.parentSettingId)
                          .map((setting) => {
                          const unmetSettingRequirement = getFirstUnmetRequirement(setting.prerequisites, featureState);
                          const disabledReason = !featureEnabled
                            ? dictionary.disabledUntilFeatureEnabled
                            : unmetSettingRequirement?.tooltip
                              ? localize(unmetSettingRequirement.tooltip, lang)
                              : undefined;
                          const settingDisabled = !featureEnabled || Boolean(unmetSettingRequirement);
                          const settingValue = featureState[feature.id]?.settings[setting.id] ?? getSettingDefaultValue(setting);
                          const childSettings =
                            feature.configuration?.filter((childSetting) => childSetting.parentSettingId === setting.id) ?? [];

                          return (
                            <div key={setting.id} className="space-y-2 rounded-lg border border-border bg-background p-3 col-span-2 md:col-span-1">
                              <FeatureSettingControl
                                featureId={feature.id}
                                setting={setting}
                                value={settingValue}
                                lang={lang}
                                disabled={settingDisabled}
                                disabledReason={disabledReason}
                                selectPlaceholder={dictionary.selectPlaceholder}
                                performanceMetrics={performanceMetrics}
                                featureSettings={featureState[feature.id]?.settings ?? {}}
                                onValueChange={(featureId, settingId, value) =>
                                  updateSettingWithDependents(feature, settingId, value)
                                }
                              />
                              {setting.description ? (
                                <p className="text-sm text-muted-foreground">{localize(setting.description, lang)}</p>
                              ) : null}
                              {childSettings.length > 0 ? (
                                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                                  {childSettings.map((childSetting) => {
                                    const unmetChildRequirement = getFirstUnmetRequirement(
                                      childSetting.prerequisites,
                                      featureState,
                                    );
                                    const childDisabled =
                                      settingDisabled || settingValue !== true || Boolean(unmetChildRequirement);
                                    const childDisabledReason = !featureEnabled
                                      ? dictionary.disabledUntilFeatureEnabled
                                      : unmetChildRequirement?.tooltip
                                        ? localize(unmetChildRequirement.tooltip, lang)
                                        : disabledReason;
                                    const childValue =
                                      featureState[feature.id]?.settings[childSetting.id] ??
                                      getSettingDefaultValue(childSetting);

                                    return (
                                      <div key={childSetting.id} className="space-y-2">
                                        <FeatureSettingControl
                                          featureId={feature.id}
                                          setting={childSetting}
                                          value={childValue}
                                          lang={lang}
                                          disabled={childDisabled}
                                          disabledReason={childDisabledReason}
                                          selectPlaceholder={dictionary.selectPlaceholder}
                                          performanceMetrics={performanceMetrics}
                                          featureSettings={featureState[feature.id]?.settings ?? {}}
                                          onValueChange={updateSetting}
                                        />
                                        {childSetting.description ? (
                                          <p className="text-sm text-muted-foreground">
                                            {localize(childSetting.description, lang)}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{dictionary.homePageTitle}</CardTitle>
            <CardDescription>{dictionary.homePageDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="home-page-path">{dictionary.homePageLabel}</Label>
              <div className="flex min-w-0 flex-col overflow-hidden rounded-md border border-input bg-background sm:flex-row">
                <div className="flex items-center border-b border-border bg-muted px-3 py-2 text-sm text-muted-foreground sm:border-b-0 sm:border-r whitespace-nowrap">
                  {dictionary.homePagePrefix}
                </div>
                <Input
                  id="home-page-path"
                  value={homePagePath}
                  placeholder={dictionary.homePagePlaceholder}
                  onChange={(event) => {
                    setHomePagePath(event.target.value);
                    setStatus("idle");
                  }}
                  className="border-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-4">
            <p>
              {dictionary.lastEditedLabel}: {formattedTimestamp}
            </p>
            <p>
              {dictionary.editedByLabel}: {metadata.modifyingUsername ?? dictionary.notAvailable}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!hasChanges || isPending}
              onClick={() => {
                setFeatureState(loadedState);
                setHomePagePath(loadedHomePagePath);
                setStatus("idle");
              }}
            >
              {dictionary.cancelButton}
            </Button>
            <Button
              type="button"
              disabled={!hasChanges || hasInvalidEnabledSettings || isPending}
              onClick={handleSave}
            >
              {dictionary.saveButton}
            </Button>
          </div>
        </div>
        {status === "success" ? <p className="text-sm text-muted-foreground">{dictionary.saveSuccess}</p> : null}
        {status === "error" ? <p className="text-sm text-destructive">{dictionary.saveError}</p> : null}
      </div>
    </TooltipProvider>
  );
}

function FeatureSettingControl({
  featureId,
  setting,
  value,
  lang,
  disabled,
  disabledReason,
  selectPlaceholder,
  performanceMetrics,
  featureSettings,
  onValueChange,
}: {
  featureId: string;
  setting: FeatureSetting;
  value: FieldValue;
  lang: Locale;
  disabled: boolean;
  disabledReason?: string;
  selectPlaceholder: string;
  performanceMetrics: FeatureConfigPerformanceMetric[];
  featureSettings: Record<string, FieldValue>;
  onValueChange: (featureId: string, settingId: string, value: FieldValue) => void;
}) {
  const id = `${featureId}-${setting.id}`;
  const label = localize(setting.label, lang);

  if (setting.type === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <DisabledTooltip content={disabledReason}>
          <Checkbox
            id={id}
            aria-label={label}
            checked={value === true}
            disabled={disabled}
            onCheckedChange={(checked) => onValueChange(featureId, setting.id, checked)}
          />
        </DisabledTooltip>
        <Label htmlFor={id}>{label}</Label>
      </div>
    );
  }

  if (setting.type === "switch") {
    return (
      <div className="flex items-center gap-2">
        <DisabledTooltip content={disabledReason}>
          <Switch
            id={id}
            aria-label={label}
            checked={value === true}
            disabled={disabled}
            onCheckedChange={(checked) => onValueChange(featureId, setting.id, checked)}
          />
        </DisabledTooltip>
        <Label htmlFor={id}>{label}</Label>
      </div>
    );
  }

  if (setting.type === "select") {
    const selectedOption = setting.options?.find((option) => option.value === value);

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <DisabledTooltip content={disabledReason}>
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={disabled}
              render={
                <Button type="button" variant="outline" className="w-full justify-between">
                  <span>{selectedOption ? localize(selectedOption.label, lang) : selectPlaceholder}</span>
                  <ChevronDown aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="min-w-(--anchor-width)">
              <DropdownMenuRadioGroup
                value={String(value)}
                onValueChange={(nextValue) => onValueChange(featureId, setting.id, nextValue)}
              >
                {setting.options?.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {localize(option.label, lang)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </DisabledTooltip>
      </div>
    );
  }

  if (setting.type === "performance-metric-select") {
    const selectedMetric = performanceMetrics.find((metric) => metric.id === value);

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <DisabledTooltip content={disabledReason}>
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={disabled}
              render={
                <Button type="button" variant="outline" className="w-full justify-between">
                  <span>{selectedMetric?.shortName ?? selectPlaceholder}</span>
                  <ChevronDown aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="min-w-(--anchor-width)">
              <DropdownMenuRadioGroup
                value={String(value)}
                onValueChange={(nextValue) => onValueChange(featureId, setting.id, nextValue)}
              >
                {performanceMetrics.map((metric) => (
                  <DropdownMenuRadioItem key={metric.id} value={metric.id}>
                    {metric.shortName}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </DisabledTooltip>
      </div>
    );
  }

  if (setting.type === "streak-valid-values") {
    const metricId = setting.dependsOnSettingId ? featureSettings[setting.dependsOnSettingId] : undefined;
    const metric = typeof metricId === "string"
      ? performanceMetrics.find((entry) => entry.id === metricId)
      : undefined;

    if (metric?.type === 0) {
      const options = splitEnumPossibilities(metric.enumPossibilities);
      const selectedValues = Array.isArray(value) ? value : [];
      const selectedLabels = selectedValues
        .map((entry) => options[entry])
        .filter((entry): entry is string => Boolean(entry));

      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <DisabledTooltip content={disabledReason}>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={disabled || options.length === 0}
                render={
                  <Button type="button" variant="outline" className="w-full justify-between">
                    <span className="min-w-0 truncate">
                      {selectedLabels.length > 0 ? selectedLabels.join(", ") : selectPlaceholder}
                    </span>
                    <ChevronDown aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="min-w-(--anchor-width)">
                {options.map((option, index) => (
                  <DropdownMenuCheckboxItem
                    key={`${option}-${index}`}
                    checked={selectedValues.includes(index)}
                    onCheckedChange={(checked) => {
                      const nextValues = checked
                        ? [...selectedValues, index]
                        : selectedValues.filter((entry) => entry !== index);
                      onValueChange(featureId, setting.id, nextValues.sort((first, second) => first - second));
                    }}
                  >
                    {option}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </DisabledTooltip>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <DisabledTooltip content={disabledReason}>
          <Input
            id={id}
            type="number"
            value={typeof value === "number" ? String(value) : "0"}
            min={setting.min ?? 0}
            step={1}
            disabled={disabled || !metric}
            onChange={(event) => onValueChange(featureId, setting.id, Number(event.target.value))}
          />
        </DisabledTooltip>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <DisabledTooltip content={disabledReason}>
        <Input
          id={id}
          type={setting.type === "date" ? "date" : setting.type === "string" ? "text" : "number"}
          value={String(value)}
          min={setting.min}
          step={setting.step}
          disabled={disabled}
          onChange={(event) => {
            const nextValue =
              setting.type === "number" || setting.type === "decimal"
                ? Number(event.target.value)
                : event.target.value;
            onValueChange(featureId, setting.id, nextValue);
          }}
        />
      </DisabledTooltip>
    </div>
  );
}
