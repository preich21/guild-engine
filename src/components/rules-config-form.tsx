"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";

import {
  getRulesConfigEntry,
  saveRulesConfig,
} from "@/app/[lang]/admin/rules-config/actions";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/config";
import type { RuleEntry } from "@/lib/rules";

type RulesConfigFormProps = {
  lang: Locale;
  locales: readonly Locale[];
  dictionary: {
    languageLabel: string;
    languagePlaceholder: string;
    contentLabel: string;
    contentPlaceholder: string;
    lastEditedLabel: string;
    never: string;
    cancelButton: string;
    previewButton: string;
    editButton: string;
    saveButton: string;
    saveSuccess: string;
    saveError: string;
  };
  languageLabels: Record<Locale, string>;
};

type LoadedState = {
  content: string;
  timestamp: string | null;
};

const emptyLoadedState: LoadedState = {
  content: "",
  timestamp: null,
};

const subscribeToMount = () => () => {};
const getMountedSnapshot = () => true;
const getServerSnapshot = () => false;

export function RulesConfigForm({
  lang,
  locales,
  dictionary,
  languageLabels,
}: RulesConfigFormProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Locale | "">("");
  const [loadedState, setLoadedState] = useState<LoadedState>(emptyLoadedState);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isMounted = useSyncExternalStore(subscribeToMount, getMountedSnapshot, getServerSnapshot);
  const isLanguageSelected = selectedLanguage !== "";
  const hasChanges = content !== loadedState.content;

  const selectedLanguageLabel = selectedLanguage
    ? languageLabels[selectedLanguage]
    : dictionary.languagePlaceholder;

  const formattedTimestamp = useMemo(() => {
    if (!loadedState.timestamp) {
      return dictionary.never;
    }

    const parsed = new Date(loadedState.timestamp);

    if (Number.isNaN(parsed.getTime())) {
      return loadedState.timestamp;
    }

    return new Intl.DateTimeFormat(lang, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  }, [dictionary.never, lang, loadedState.timestamp]);

  const applyLoadedEntry = (entry: RuleEntry | null) => {
    const nextLoadedState = {
      content: entry?.content ?? "",
      timestamp: entry?.timestamp ?? null,
    };

    setLoadedState(nextLoadedState);
    setContent(nextLoadedState.content);
    setIsPreviewing(false);
  };

  const handleLanguageChange = (languageCode: string) => {
    if (!locales.includes(languageCode as Locale)) {
      return;
    }

    const nextLanguage = languageCode as Locale;
    setSelectedLanguage(nextLanguage);
    setIsLanguageMenuOpen(false);
    setStatus("idle");

    startTransition(async () => {
      const entry = await getRulesConfigEntry(nextLanguage);
      applyLoadedEntry(entry);
    });
  };

  const handleSave = () => {
    if (!selectedLanguage) {
      return;
    }

    setStatus("idle");

    startTransition(async () => {
      const result = await saveRulesConfig(lang, selectedLanguage, content);

      if (result.status === "success") {
        applyLoadedEntry(result.entry);
        setStatus("success");
        return;
      }

      setStatus("error");
    });
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{dictionary.languageLabel}</Label>
        <DropdownMenu open={isLanguageMenuOpen} onOpenChange={setIsLanguageMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="outline" className="w-full justify-between sm:w-64">
                <span>{selectedLanguageLabel}</span>
                <ChevronDown aria-hidden="true" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="min-w-[var(--anchor-width)]">
            <DropdownMenuRadioGroup value={selectedLanguage} onValueChange={handleLanguageChange}>
              {locales.map((locale) => (
                <DropdownMenuRadioItem key={locale} value={locale}>
                  <span>{languageLabels[locale]}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rules-content">{dictionary.contentLabel}</Label>
        <Textarea
          id="rules-content"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setStatus("idle");
          }}
          placeholder={dictionary.contentPlaceholder}
          disabled={!isLanguageSelected || isPending}
          className={isPreviewing ? "hidden" : "min-h-80 resize-y"}
        />
        {isPreviewing ? (
          <div className="min-h-80 rounded-lg border border-input bg-background px-3 py-2">
            <MarkdownContent content={content} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {dictionary.lastEditedLabel}: {formattedTimestamp}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setContent(loadedState.content);
              setStatus("idle");
              setIsPreviewing(false);
            }}
            disabled={!isLanguageSelected || isPending || !hasChanges}
          >
            {dictionary.cancelButton}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPreviewing((current) => !current)}
            disabled={!isLanguageSelected || isPending}
          >
            {isPreviewing ? dictionary.editButton : dictionary.previewButton}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!isLanguageSelected || isPending || !hasChanges}>
            {dictionary.saveButton}
          </Button>
        </div>
      </div>

      {status === "success" ? <p className="text-sm text-muted-foreground">{dictionary.saveSuccess}</p> : null}
      {status === "error" ? <p className="text-sm text-destructive">{dictionary.saveError}</p> : null}
    </div>
  );
}
