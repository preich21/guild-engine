"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import type {
  ProfileEditTeam,
  SaveProfileActionState,
} from "@/app/[lang]/user/[uuid]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserProfileForm, type UserProfileFormDictionary } from "@/components/user-profile-form";
import type { Locale } from "@/i18n/config";
export type UserProfileEditDictionary = UserProfileFormDictionary & {
  editProfileButton: string;
  editProfileTitle: string;
  editProfileDescription: string;
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
  const [open, setOpen] = useState(false);
  const formKey = `${open}-${userId}-${username}-${profilePicture ?? ""}-${description ?? ""}-${teamId}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
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
        <UserProfileForm
          key={formKey}
          lang={lang}
          userId={userId}
          initialValues={{
            username,
            profilePicture,
            description,
            teamId,
          }}
          teams={teams}
          dictionary={dictionary}
          action={action}
          showCancel
          onCancel={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
