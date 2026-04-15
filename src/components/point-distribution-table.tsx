"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  PointDistributionEntry,
  SavePointDistributionActionState,
} from "@/app/[lang]/admin/point-distribution/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Locale } from "@/i18n/config";

type EditablePointDistributionEntry = {
  id: string;
  activeFrom: string;
  attendanceVirtual: string;
  attendanceOnSite: string;
  protocolForced: string;
  protocolVoluntarily: string;
  moderation: string;
  workingGroup: string;
  twl: string;
  presentation: string;
};

type PointDistributionTableProps = {
  lang: Locale;
  rows: PointDistributionEntry[];
  action: (
    state: SavePointDistributionActionState,
    formData: FormData,
  ) => Promise<SavePointDistributionActionState>;
  deleteAction: (lang: unknown, id: unknown) => Promise<boolean>;
  dictionary: {
    heading: string;
    warning: string;
    explanation: string;
    addEntryButton: string;
    hideIdColumnButton: string;
    showIdColumnButton: string;
    deleteRowButton: string;
    confirmDeleteMessage: string;
    confirmDeleteYesButton: string;
    confirmDeleteNoButton: string;
    deleteError: string;
    saveButton: string;
    saveSuccess: string;
    saveError: string;
    columns: {
      id: string;
      activeFrom: string;
      attendanceVirtual: string;
      attendanceOnSite: string;
      protocolForced: string;
      protocolVoluntarily: string;
      moderation: string;
      workingGroup: string;
      twl: string;
      presentation: string;
    };
  };
};

const initialState: SavePointDistributionActionState = { status: "idle" };

const toDateTimeLocalValue = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toEditableRow = (row: PointDistributionEntry): EditablePointDistributionEntry => ({
  id: row.id,
  activeFrom: toDateTimeLocalValue(row.activeFrom),
  attendanceVirtual: String(row.attendanceVirtual),
  attendanceOnSite: String(row.attendanceOnSite),
  protocolForced: String(row.protocolForced),
  protocolVoluntarily: String(row.protocolVoluntarily),
  moderation: String(row.moderation),
  workingGroup: String(row.workingGroup),
  twl: String(row.twl),
  presentation: String(row.presentation),
});

const createDefaultRow = (): EditablePointDistributionEntry => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  const hours = `${now.getHours()}`.padStart(2, "0");
  const minutes = `${now.getMinutes()}`.padStart(2, "0");

  return {
    id: crypto.randomUUID(),
    activeFrom: `${year}-${month}-${day}T${hours}:${minutes}`,
    attendanceVirtual: "0",
    attendanceOnSite: "0",
    protocolForced: "0",
    protocolVoluntarily: "0",
    moderation: "0",
    workingGroup: "0",
    twl: "0",
    presentation: "0",
  };
};

export function PointDistributionTable({
  lang,
  rows,
  action,
  deleteAction,
  dictionary,
}: PointDistributionTableProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);
  const [deleteError, setDeleteError] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [confirmingRowId, setConfirmingRowId] = useState<string | null>(null);
  const [showIdColumn, setShowIdColumn] = useState(false);
  const [editableRows, setEditableRows] = useState<EditablePointDistributionEntry[]>(
    () => rows.map(toEditableRow),
  );

  const rowsPayload = useMemo(
    () =>
      JSON.stringify(
        editableRows.map((row) => ({
          id: row.id,
          activeFrom: row.activeFrom,
          attendanceVirtual: row.attendanceVirtual,
          attendanceOnSite: row.attendanceOnSite,
          protocolForced: row.protocolForced,
          protocolVoluntarily: row.protocolVoluntarily,
          moderation: row.moderation,
          workingGroup: row.workingGroup,
          twl: row.twl,
          presentation: row.presentation,
        })),
      ),
    [editableRows],
  );

  const updateRow = (
    rowId: string,
    field: keyof Omit<EditablePointDistributionEntry, "id">,
    value: string,
  ) => {
    setEditableRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  };

  const isBusy = pending || isDeleting;

  const formatDeleteDateLabel = (dateValue: string) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return new Intl.DateTimeFormat(lang, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const handleDeleteRow = (rowId: string) => {
    setDeleteError(false);

    startDeleteTransition(async () => {
      const deleted = await deleteAction(lang, rowId);

      if (!deleted) {
        setDeleteError(true);
        return;
      }

      setEditableRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
      setConfirmingRowId(null);
      router.refresh();
    });
  };

  return (
    <section className="w-full space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dictionary.heading}</h1>
        <p className="text-sm text-muted-foreground">{dictionary.warning}</p>
        <p className="text-sm text-muted-foreground">{dictionary.explanation}</p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="rows" value={rowsPayload} />

        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                {showIdColumn ? <TableHead className="min-w-56">{dictionary.columns.id}</TableHead> : null}
                <TableHead className="min-w-44">{dictionary.columns.activeFrom}</TableHead>
                <TableHead className="min-w-20">{dictionary.columns.attendanceVirtual}</TableHead>
                <TableHead className="min-w-20">{dictionary.columns.attendanceOnSite}</TableHead>
                <TableHead className="min-w-20">{dictionary.columns.protocolForced}</TableHead>
                <TableHead className="min-w-20">{dictionary.columns.protocolVoluntarily}</TableHead>
                <TableHead className="min-w-20">{dictionary.columns.moderation}</TableHead>
                <TableHead className="min-w-20">{dictionary.columns.workingGroup}</TableHead>
                <TableHead className="min-w-20">{dictionary.columns.twl}</TableHead>
                <TableHead className="min-w-20">{dictionary.columns.presentation}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {editableRows.map((row) => (
                <TableRow key={row.id}>
                  {showIdColumn ? (
                    <TableCell className="min-w-56 font-mono text-xs text-muted-foreground">{row.id}</TableCell>
                  ) : null}
                  <TableCell className="min-w-44">
                    <Input
                      type="datetime-local"
                      value={row.activeFrom}
                      onChange={(event) => updateRow(row.id, "activeFrom", event.target.value)}
                      required
                      disabled={isBusy}
                    />
                  </TableCell>
                  <TableCell className="min-w-20">
                    <Input
                      type="number"
                      value={row.attendanceVirtual}
                      onChange={(event) => updateRow(row.id, "attendanceVirtual", event.target.value)}
                      required
                      disabled={isBusy}
                    />
                  </TableCell>
                  <TableCell className="min-w-20">
                    <Input
                      type="number"
                      value={row.attendanceOnSite}
                      onChange={(event) => updateRow(row.id, "attendanceOnSite", event.target.value)}
                      required
                      disabled={isBusy}
                    />
                  </TableCell>
                  <TableCell className="min-w-20">
                    <Input
                      type="number"
                      value={row.protocolForced}
                      onChange={(event) => updateRow(row.id, "protocolForced", event.target.value)}
                      required
                      disabled={isBusy}
                    />
                  </TableCell>
                  <TableCell className="min-w-20">
                    <Input
                      type="number"
                      value={row.protocolVoluntarily}
                      onChange={(event) => updateRow(row.id, "protocolVoluntarily", event.target.value)}
                      required
                      disabled={isBusy}
                    />
                  </TableCell>
                  <TableCell className="min-w-20">
                    <Input
                      type="number"
                      value={row.moderation}
                      onChange={(event) => updateRow(row.id, "moderation", event.target.value)}
                      required
                      disabled={isBusy}
                    />
                  </TableCell>
                  <TableCell className="min-w-20">
                    <Input
                      type="number"
                      value={row.workingGroup}
                      onChange={(event) => updateRow(row.id, "workingGroup", event.target.value)}
                      required
                      disabled={isBusy}
                    />
                  </TableCell>
                  <TableCell className="min-w-20">
                    <Input
                      type="number"
                      value={row.twl}
                      onChange={(event) => updateRow(row.id, "twl", event.target.value)}
                      required
                      disabled={isBusy}
                    />
                  </TableCell>
                  <TableCell className="min-w-20">
                    <Input
                      type="number"
                      value={row.presentation}
                      onChange={(event) => updateRow(row.id, "presentation", event.target.value)}
                      required
                      disabled={isBusy}
                    />
                  </TableCell>
                  <TableCell className="w-12">
                    <Popover
                      open={confirmingRowId === row.id}
                      onOpenChange={(open) => setConfirmingRowId(open ? row.id : null)}
                    >
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={dictionary.deleteRowButton}
                            title={dictionary.deleteRowButton}
                            onClick={() => {
                              setDeleteError(false);
                              setConfirmingRowId(row.id);
                            }}
                            disabled={isBusy}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        }
                      />
                      <PopoverContent align="end" className="w-80">
                        <PopoverHeader>
                          <PopoverTitle>{dictionary.deleteRowButton}</PopoverTitle>
                          <PopoverDescription>
                            {dictionary.confirmDeleteMessage.replace("{date}", formatDeleteDateLabel(row.activeFrom))}
                          </PopoverDescription>
                        </PopoverHeader>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmingRowId(null)}
                            disabled={isBusy}
                          >
                            {dictionary.confirmDeleteNoButton}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleDeleteRow(row.id)}
                            disabled={isBusy}
                          >
                            {dictionary.confirmDeleteYesButton}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditableRows((currentRows) => [...currentRows, createDefaultRow()])}
              disabled={isBusy}
              className="w-full sm:w-auto"
            >
              <Plus />
              {dictionary.addEntryButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowIdColumn((current) => !current)}
              disabled={isBusy}
              className="w-full sm:w-auto"
            >
              {showIdColumn ? dictionary.hideIdColumnButton : dictionary.showIdColumnButton}
            </Button>
          </div>

          <Button type="submit" disabled={isBusy} className="w-full sm:w-auto">
            {dictionary.saveButton}
          </Button>
        </div>

        {state.status === "success" ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{dictionary.saveSuccess}</p>
        ) : null}

        {state.status === "error" ? (
          <p className="text-sm text-destructive">{dictionary.saveError}</p>
        ) : null}

        {deleteError ? (
          <p className="text-sm text-destructive">{dictionary.deleteError}</p>
        ) : null}
      </form>
    </section>
  );
}
