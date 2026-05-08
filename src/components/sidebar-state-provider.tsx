"use client";

import React, { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

const SIDEBAR_STORAGE_KEY = "guild-engine-sidebar-expanded";
const SIDEBAR_STORAGE_EVENT = "guild-engine-sidebar-storage";

type SidebarStateContextValue = {
  expanded: boolean;
  toggleExpanded: () => void;
};

const SidebarStateContext = createContext<SidebarStateContextValue | null>(null);

const getStoredExpandedState = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
};

const subscribeToStoredExpandedState = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_STORAGE_EVENT, onStoreChange);
  };
};

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const expanded = useSyncExternalStore(
    subscribeToStoredExpandedState,
    getStoredExpandedState,
    () => false,
  );

  const toggleExpanded = useCallback(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!getStoredExpandedState()));
    window.dispatchEvent(new Event(SIDEBAR_STORAGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({
      expanded,
      toggleExpanded,
    }),
    [expanded, toggleExpanded],
  );

  return (
    <SidebarStateContext.Provider value={value}>
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState() {
  const value = useContext(SidebarStateContext);

  if (!value) {
    throw new Error("useSidebarState must be used within SidebarStateProvider");
  }

  return value;
}
