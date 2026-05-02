"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CreatePerformanceMetricActionState,
  PerformanceMetricEntry,
} from "@/app/[lang]/admin/performance-metric-config/actions";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/config";

type PerformanceMetricConfigListProps = {
  lang: Locale;
  rows: PerformanceMetricEntry[];
  createAction: (
    state: CreatePerformanceMetricActionState,
    formData: FormData,
  ) => Promise<CreatePerformanceMetricActionState>;
  dictionary: {
    heading: string;
    addNewButton: string;
    noEntries: string;
    newCardTitle: string;
    shortNameLabel: string;
    questionLabel: string;
    typeLabel: string;
    enumPossibilitiesLabel: string;
    enumPossibilitiesPlaceholder: string;
    shortNamePlaceholder: string;
    questionPlaceholder: string;
    idLabel: string;
    timestampAddedLabel: string;
    typeEnum: string;
    typeInteger: string;
    typeUnknown: string;
    cancelButton: string;
    saveButton: string;
    saveSuccess: string;
    saveError: string;
  };
};

type DraftPerformanceMetric = {
  shortName: string;
  question: string;
  type: "0" | "1";
  enumPossibilities: string;
};

const initialState: CreatePerformanceMetricActionState = { status: "idle" };

const defaultDraft = (): DraftPerformanceMetric => ({
  shortName: "",
  question: "",
  type: "0",
  enumPossibilities: "",
});

const getTypeLabel = (
  type: number,
  dictionary: PerformanceMetricConfigListProps["dictionary"],
) => {
  if (type === 0) {
    return dictionary.typeEnum;
  }

  if (type === 1) {
    return dictionary.typeInteger;
  }

  return dictionary.typeUnknown;
};

export function PerformanceMetricConfigList({
  lang,
  rows,
  createAction,
  dictionary,
}: PerformanceMetricConfigListProps) {
  const formId = useId();
  const router = useRouter();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [draft, setDraft] = useState<DraftPerformanceMetric>(() => defaultDraft());
  const [state, formAction, pending] = useActionState(
    async (previousState: CreatePerformanceMetricActionState, formData: FormData) => {
      const nextState = await createAction(previousState, formData);

      if (nextState.status === "success") {
        setDraft(defaultDraft());
        setIsAddingNew(false);
        router.refresh();
      }

      return nextState;
    },
    initialState,
  );

  const isEnumType = draft.type === "0";
  const isFormValid =
    draft.shortName.trim() !== "" &&
    draft.shortName.length <= 30 &&
    draft.question.trim() !== "" &&
    draft.question.length <= 255 &&
    (!isEnumType || (draft.enumPossibilities.trim() !== "" && draft.enumPossibilities.length <= 511));

  const handleStartCreate = () => {
    setDraft(defaultDraft());
    setIsAddingNew(true);
  };

  const handleCancelCreate = () => {
    setDraft(defaultDraft());
    setIsAddingNew(false);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dictionary.heading}</h1>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={handleStartCreate}
          disabled={isAddingNew || pending}
          aria-label={dictionary.addNewButton}
          title={dictionary.addNewButton}
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-4">
        {isAddingNew ? (
          <Card>
            <CardHeader>
              <CardTitle>{dictionary.newCardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <form id={formId} action={formAction} className="space-y-5">
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="type" value={draft.type} />

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-short-name`}>{dictionary.shortNameLabel}</Label>
                  <Input
                    id={`${formId}-short-name`}
                    name="shortName"
                    maxLength={30}
                    value={draft.shortName}
                    placeholder={dictionary.shortNamePlaceholder}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, shortName: event.target.value }))
                    }
                    required
                    disabled={pending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-question`}>{dictionary.questionLabel}</Label>
                  <Textarea
                    id={`${formId}-question`}
                    name="question"
                    rows={1}
                    maxLength={255}
                    className="min-h-8 resize-y"
                    value={draft.question}
                    placeholder={dictionary.questionPlaceholder}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, question: event.target.value }))
                    }
                    required
                    disabled={pending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-type`}>{dictionary.typeLabel}</Label>
                  <div id={`${formId}-type`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between"
                            disabled={pending}
                            aria-label={dictionary.typeLabel}
                          >
                            <span>{draft.type === "0" ? dictionary.typeEnum : dictionary.typeInteger}</span>
                            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="start" className="min-w-[var(--anchor-width)]">
                        <DropdownMenuRadioGroup
                          value={draft.type}
                          onValueChange={(value) => {
                            if (value === "0" || value === "1") {
                              setDraft((current) => ({ ...current, type: value }));
                            }
                          }}
                        >
                          <DropdownMenuRadioItem value="0">{dictionary.typeEnum}</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="1">{dictionary.typeInteger}</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {isEnumType ? (
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-enum-possibilities`}>
                      {dictionary.enumPossibilitiesLabel}
                    </Label>
                    <Textarea
                      id={`${formId}-enum-possibilities`}
                      name="enumPossibilities"
                      maxLength={511}
                      rows={1}
                      className="min-h-8 resize-y"
                      value={draft.enumPossibilities}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          enumPossibilities: event.target.value,
                        }))
                      }
                      placeholder={dictionary.enumPossibilitiesPlaceholder}
                      required
                      disabled={pending}
                    />
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleCancelCreate}
                    disabled={pending}
                  >
                    {dictionary.cancelButton}
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto" disabled={pending || !isFormValid}>
                    {dictionary.saveButton}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {state.status === "success" ? (
          <p className="text-sm text-muted-foreground">{dictionary.saveSuccess}</p>
        ) : null}
        {state.status === "error" ? (
          <p className="text-sm text-destructive">{dictionary.saveError}</p>
        ) : null}

        {rows.length === 0 && !isAddingNew ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            {dictionary.noEntries}
          </p>
        ) : null}

        {rows.map((row) => (
          <Card key={row.id}>
            <CardHeader>
              <CardTitle>{row.shortName}</CardTitle>
              <CardAction />
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-medium text-foreground">{dictionary.questionLabel}:</dt>
                  <dd className="break-words text-muted-foreground">{row.question}</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-medium text-foreground">{dictionary.idLabel}:</dt>
                  <dd className="break-all text-muted-foreground">{row.id}</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-medium text-foreground">{dictionary.enumPossibilitiesLabel}:</dt>
                  <dd className="break-words text-muted-foreground">{row.enumPossibilities ?? "--"}</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-medium text-foreground">{dictionary.timestampAddedLabel}:</dt>
                  <dd className="break-words text-muted-foreground">{row.timestampAdded}</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-medium text-foreground">{dictionary.typeLabel}:</dt>
                  <dd className="text-muted-foreground">{getTypeLabel(row.type, dictionary)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
