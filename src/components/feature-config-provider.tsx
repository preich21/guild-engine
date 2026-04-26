"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

import {
  getFeatureSettingValue,
  isFeatureEnabled,
  isFeatureSettingEnabled,
  type FeatureConfigState,
} from "@/lib/feature-flags";

type FeatureConfigContextValue = {
  state: FeatureConfigState;
  setState: (state: FeatureConfigState) => void;
};

const FeatureConfigContext = createContext<FeatureConfigContextValue | null>(null);

export function FeatureConfigProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState: FeatureConfigState;
}) {
  const [state, setState] = useState(initialState);
  const value = useMemo(() => ({ state, setState }), [state]);

  return (
    <FeatureConfigContext.Provider value={value}>
      {children}
    </FeatureConfigContext.Provider>
  );
}

export const useFeatureConfig = () => {
  const value = useContext(FeatureConfigContext);

  if (!value) {
    throw new Error("useFeatureConfig must be used within FeatureConfigProvider");
  }

  return value;
};

export const useFeatureEnabled = (featureId: string) => {
  const { state } = useFeatureConfig();
  return isFeatureEnabled(state, featureId);
};

export const useFeatureSettingEnabled = (featureId: string, settingId: string) => {
  const { state } = useFeatureConfig();
  return isFeatureSettingEnabled(state, featureId, settingId);
};

export const useFeatureSettingValue = (featureId: string, settingId: string) => {
  const { state } = useFeatureConfig();
  return getFeatureSettingValue(state, featureId, settingId);
};
