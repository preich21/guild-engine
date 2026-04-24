"use client";

import { ChevronDown } from "lucide-react";
import { useActionState, useId, useMemo, useState } from "react";

import type {
  ManualPointsUser,
  SaveManualPointsActionState,
} from "@/app/[lang]/admin/manual-points/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/config";

type ManualPointsFormProps = {
  lang: Locale;
  users: ManualPointsUser[];
  action: (
    state: SaveManualPointsActionState,
    formData: FormData,
  ) => Promise<SaveManualPointsActionState>;
  dictionary: {
    heading: string;
    description: string;
    userLabel: string;
    userPlaceholder: string;
    pointsLabel: string;
    pointsPlaceholder: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    cancelButton: string;
    saveButton: string;
    saveSuccess: string;
    saveError: string;
    confirmTitle: string;
    confirmDescription: string;
    confirmCancelButton: string;
    confirmSaveButton: string;
    noUsers: string;
  };
};

const initialState: SaveManualPointsActionState = { status: "idle" };

const formatUserLabel = (user: ManualPointsUser) => `${user.username} [${user.id}]`;

export function ManualPointsForm({
  lang,
  users,
  action,
  dictionary,
}: ManualPointsFormProps) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const isFormValid = selectedUserId !== "" && points !== "" && reason.trim() !== "";
  const isDisabled = pending || users.length === 0;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dictionary.heading}</h1>
        <p className="text-sm text-muted-foreground">{dictionary.description}</p>
      </div>

      <form id={formId} action={formAction} className="space-y-6">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="userId" value={selectedUserId} />

        <div className="space-y-2">
          <Label htmlFor={`${formId}-user`}>{dictionary.userLabel}</Label>
          <div id={`${formId}-user`}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    disabled={isDisabled}
                    aria-label={dictionary.userLabel}
                    title={dictionary.userLabel}
                  >
                    <span className="truncate">
                      {selectedUser ? formatUserLabel(selectedUser) : dictionary.userPlaceholder}
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="min-w-[var(--anchor-width)] max-w-[min(100vw-2rem,40rem)]">
                <DropdownMenuRadioGroup value={selectedUserId} onValueChange={setSelectedUserId}>
                  {users.length === 0 ? (
                    <DropdownMenuRadioItem value="__no_users__" disabled>
                      {dictionary.noUsers}
                    </DropdownMenuRadioItem>
                  ) : (
                    users.map((user) => (
                      <DropdownMenuRadioItem key={user.id} value={user.id}>
                        {formatUserLabel(user)}
                      </DropdownMenuRadioItem>
                    ))
                  )}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-points`}>{dictionary.pointsLabel}</Label>
            <Input
              id={`${formId}-points`}
              name="points"
              type="number"
              min={1}
              max={32767}
              step={1}
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              placeholder={dictionary.pointsPlaceholder}
              required
              disabled={isDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-reason`}>{dictionary.reasonLabel}</Label>
            <Textarea
              id={`${formId}-reason`}
              name="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={dictionary.reasonPlaceholder}
              required
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="reset"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setSelectedUserId("");
              setPoints("");
              setReason("");
              setIsConfirmOpen(false);
            }}
            className="w-full sm:w-auto"
          >
            {dictionary.cancelButton}
          </Button>

          <Popover open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  disabled={!isFormValid || isDisabled}
                  onClick={() => setIsConfirmOpen(true)}
                  className="w-full sm:w-auto"
                >
                  {dictionary.saveButton}
                </Button>
              }
            />
            <PopoverContent align="end" className="w-[min(28rem,calc(100vw-2rem))]">
              <PopoverHeader>
                <PopoverTitle>{dictionary.confirmTitle}</PopoverTitle>
                <PopoverDescription>{dictionary.confirmDescription}</PopoverDescription>
              </PopoverHeader>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirmOpen(false)}
                  disabled={pending}
                >
                  {dictionary.confirmCancelButton}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  form={formId}
                  onClick={() => setIsConfirmOpen(false)}
                  disabled={!isFormValid || pending}
                >
                  {dictionary.confirmSaveButton}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {state.status === "success" ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{dictionary.saveSuccess}</p>
        ) : null}

        {state.status === "error" ? (
          <p className="text-sm text-destructive">{dictionary.saveError}</p>
        ) : null}
      </form>
    </section>
  );
}
