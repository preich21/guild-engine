"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
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

type FieldValue = boolean | number | string;

type FeatureSetting = {
  id: string;
  type: "checkbox" | "date" | "decimal" | "number" | "select" | "switch";
  label: LocalizedText;
  description?: LocalizedText;
  defaultValue?: FieldValue;
  min?: number;
  step?: number;
  options?: Array<{
    value: string;
    label: LocalizedText;
  }>;
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

type FeatureState = Record<
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
    cancelButton: string;
    saveButton: string;
    savedAlert: string;
    selectPlaceholder: string;
    disabledUntilFeatureEnabled: string;
  };
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

const evaluateCondition = (condition: RequirementCondition, state: FeatureState): boolean => {
  if ("featureEnabled" in condition) {
    return state[condition.featureEnabled]?.enabled === true;
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
}: FeatureConfigurationFormProps) {
  const initialState = useMemo(() => buildInitialState(catalog.features), [catalog.features]);
  const [featureState, setFeatureState] = useState<FeatureState>(initialState);
  const serializedInitialState = useMemo(() => JSON.stringify(initialState), [initialState]);
  const hasChanges = JSON.stringify(featureState) !== serializedInitialState;

  const updateFeatureEnabled = (featureId: string, enabled: boolean) => {
    setFeatureState((current) => ({
      ...current,
      [featureId]: {
        ...current[featureId],
        enabled,
      },
    }));
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
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="grid gap-4">
          {catalog.features.map((feature) => {
            const unmetFeatureRequirement = getFirstUnmetRequirement(feature.prerequisites, featureState);
            const isFeatureDisabled = Boolean(unmetFeatureRequirement);
            const featureEnabled = featureState[feature.id]?.enabled === true;

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
                      <div className="grid gap-4 sm:grid-cols-2">
                        <p className="text-sm font-medium col-span-2">{dictionary.configurationLabel}</p>
                        {feature.configuration?.map((setting) => {
                          const unmetSettingRequirement = getFirstUnmetRequirement(setting.prerequisites, featureState);
                          const disabledReason = !featureEnabled
                            ? dictionary.disabledUntilFeatureEnabled
                            : unmetSettingRequirement?.tooltip
                              ? localize(unmetSettingRequirement.tooltip, lang)
                              : undefined;
                          const settingDisabled = !featureEnabled || Boolean(unmetSettingRequirement);
                          const settingValue = featureState[feature.id]?.settings[setting.id] ?? getSettingDefaultValue(setting);

                          return (
                            <div key={setting.id} className="space-y-2 rounded-lg border border-border bg-background p-3">
                              <FeatureSettingControl
                                featureId={feature.id}
                                setting={setting}
                                value={settingValue}
                                lang={lang}
                                disabled={settingDisabled}
                                disabledReason={disabledReason}
                                selectPlaceholder={dictionary.selectPlaceholder}
                                onValueChange={updateSetting}
                              />
                              {setting.description ? (
                                <p className="text-sm text-muted-foreground">{localize(setting.description, lang)}</p>
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

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!hasChanges}
            onClick={() => setFeatureState(initialState)}
          >
            {dictionary.cancelButton}
          </Button>
          <Button
            type="button"
            disabled={!hasChanges}
            onClick={() => {
              window.alert(dictionary.savedAlert);
            }}
          >
            {dictionary.saveButton}
          </Button>
        </div>
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
  onValueChange,
}: {
  featureId: string;
  setting: FeatureSetting;
  value: FieldValue;
  lang: Locale;
  disabled: boolean;
  disabledReason?: string;
  selectPlaceholder: string;
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
            onCheckedChange={(checked) => onValueChange(featureId, setting.id, checked === true)}
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
            <DropdownMenuContent align="start" className="min-w-[var(--anchor-width)]">
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

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <DisabledTooltip content={disabledReason}>
        <Input
          id={id}
          type={setting.type === "date" ? "date" : "number"}
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
