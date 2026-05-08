"use client";

import { useSyncExternalStore } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { useSidebarState } from "@/components/sidebar-state-provider";
import { Button } from "@/components/ui/button";

type SidebarToggleButtonProps = {
  expandLabel: string;
  collapseLabel: string;
};

const desktopMediaQuery = "(min-width: 768px)";

const subscribeToDesktopViewport = (onStoreChange: () => void) => {
  const mediaQueryList = window.matchMedia(desktopMediaQuery);
  mediaQueryList.addEventListener("change", onStoreChange);

  return () => mediaQueryList.removeEventListener("change", onStoreChange);
};

const getDesktopViewportSnapshot = () => window.matchMedia(desktopMediaQuery).matches;

export function SidebarToggleButton({
  expandLabel,
  collapseLabel,
}: SidebarToggleButtonProps) {
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopViewport,
    getDesktopViewportSnapshot,
    () => false,
  );
  const { expanded, toggleExpanded } = useSidebarState();
  const label = expanded ? collapseLabel : expandLabel;
  const Icon = expanded ? ChevronsLeft : ChevronsRight;

  if (!isDesktop) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      onClick={toggleExpanded}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
