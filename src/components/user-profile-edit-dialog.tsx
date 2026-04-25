"use client";

import Image from "next/image";
import { ChevronDown, Pencil, Upload } from "lucide-react";
import { useActionState, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  ProfileEditTeam,
  SaveProfileActionState,
} from "@/app/[lang]/user/[uuid]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const PROFILE_IMAGE_SIZE = 84;
const initialState: SaveProfileActionState = { status: "idle" };

type ProfileEditDraft = {
  username: string;
  profilePicture: string;
  description: string;
  teamId: string;
};

export type UserProfileEditDictionary = {
  editProfileButton: string;
  editProfileTitle: string;
  editProfileDescription: string;
  profilePictureLabel: string;
  profilePictureUploadButton: string;
  profilePictureUploadHint: string;
  imageUploadError: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  teamLabel: string;
  teamPlaceholder: string;
  cancelButton: string;
  saveButton: string;
  saveError: string;
};

type UserProfileEditDialogProps = {
  lang: Locale;
  userId: string;
  username: string;
  profilePicture: string | null;
  description: string | null;
  teamId: string;
  teams: ProfileEditTeam[];
  dictionary: UserProfileEditDictionary;
  action: (
    state: SaveProfileActionState,
    formData: FormData,
  ) => Promise<SaveProfileActionState>;
};

const resizeImageToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = PROFILE_IMAGE_SIZE;
      canvas.height = PROFILE_IMAGE_SIZE;

      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Missing canvas context"));
        return;
      }

      const scale = Math.max(PROFILE_IMAGE_SIZE / image.width, PROFILE_IMAGE_SIZE / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      const x = (PROFILE_IMAGE_SIZE - width) / 2;
      const y = (PROFILE_IMAGE_SIZE - height) / 2;

      context.clearRect(0, 0, PROFILE_IMAGE_SIZE, PROFILE_IMAGE_SIZE);
      context.drawImage(image, x, y, width, height);

      const dataUrl = canvas.toDataURL("image/webp", 0.9);

      URL.revokeObjectURL(objectUrl);
      resolve(dataUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };

    image.src = objectUrl;
  });

export function UserProfileEditDialog({
  lang,
  userId,
  username,
  profilePicture,
  description,
  teamId,
  teams,
  dictionary,
  action,
}: UserProfileEditDialogProps) {
  const formId = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [draft, setDraft] = useState<ProfileEditDraft>({
    username,
    profilePicture: profilePicture ?? "",
    description: description ?? "",
    teamId,
  });
  const [state, formAction, pending] = useActionState(
    async (previousState: SaveProfileActionState, formData: FormData) => {
      const nextState = await action(previousState, formData);

      if (nextState.status === "success") {
        setOpen(false);
        setImageError(false);
        router.refresh();
      }

      return nextState;
    },
    initialState,
  );

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === draft.teamId) ?? null,
    [draft.teamId, teams],
  );
  const isFormValid =
    draft.username.trim() !== "" &&
    draft.username.length <= 255 &&
    draft.description.length <= 1023 &&
    !imageError;
  const isDisabled = pending || teams.length === 0;

  const resetDraft = () => {
    setDraft({
      username,
      profilePicture: profilePicture ?? "",
      description: description ?? "",
      teamId,
    });
    setImageError(false);
  };

  const handleImageChange = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      const image = await resizeImageToBase64(file);
      setDraft((currentDraft) => ({ ...currentDraft, profilePicture: image }));
      setImageError(false);
    } catch {
      setImageError(true);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
          resetDraft();
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={dictionary.editProfileButton}
            title={dictionary.editProfileButton}
          >
            <Pencil aria-hidden="true" />
          </Button>
        }
      />
      <DialogContent className="w-[min(95vw,36rem)]">
        <DialogHeader>
          <DialogTitle>{dictionary.editProfileTitle}</DialogTitle>
          <DialogDescription>{dictionary.editProfileDescription}</DialogDescription>
        </DialogHeader>

        <form id={formId} action={formAction} className="space-y-5">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="profilePicture" value={draft.profilePicture} />
          <input type="hidden" name="teamId" value={draft.teamId} />

          <div className="space-y-2">
            <Label htmlFor={`${formId}-profile-picture`}>{dictionary.profilePictureLabel}</Label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative flex size-21 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {draft.profilePicture ? (
                  <Image
                    src={draft.profilePicture}
                    alt=""
                    fill
                    sizes={`${PROFILE_IMAGE_SIZE}px`}
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <Input
                  id={`${formId}-profile-picture`}
                  type="file"
                  accept="image/*"
                  aria-label={dictionary.profilePictureUploadButton}
                  title={dictionary.profilePictureUploadButton}
                  disabled={isDisabled}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void handleImageChange(file);
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  {dictionary.profilePictureUploadHint}
                </p>
                {imageError ? (
                  <p className="text-sm text-destructive">{dictionary.imageUploadError}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-username`}>{dictionary.usernameLabel}</Label>
            <Input
              id={`${formId}-username`}
              name="username"
              value={draft.username}
              maxLength={255}
              placeholder={dictionary.usernamePlaceholder}
              disabled={isDisabled}
              required
              onChange={(event) =>
                setDraft((currentDraft) => ({ ...currentDraft, username: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-description`}>{dictionary.descriptionLabel}</Label>
            <Textarea
              id={`${formId}-description`}
              name="description"
              value={draft.description}
              maxLength={1000}
              placeholder={dictionary.descriptionPlaceholder}
              disabled={isDisabled}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  description: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>{dictionary.teamLabel}</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDisabled}
                    className="w-full justify-between"
                    aria-label={dictionary.teamLabel}
                    title={dictionary.teamLabel}
                  >
                    <span className="truncate">
                      {selectedTeam ? selectedTeam.name : dictionary.teamPlaceholder}
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="min-w-[var(--anchor-width)]">
                <DropdownMenuRadioGroup
                  value={draft.teamId}
                  onValueChange={(nextTeamId) =>
                    setDraft((currentDraft) => ({ ...currentDraft, teamId: nextTeamId }))
                  }
                >
                  {teams.map((team) => (
                    <DropdownMenuRadioItem key={team.id} value={team.id}>
                      {team.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {state.status === "error" ? (
            <p className="text-sm text-destructive">{dictionary.saveError}</p>
          ) : null}
        </form>

        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={pending} onClick={resetDraft}>
                {dictionary.cancelButton}
              </Button>
            }
          />
          <Button type="submit" form={formId} disabled={!isFormValid || isDisabled}>
            {dictionary.saveButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
