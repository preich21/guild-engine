"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoginActionState } from "@/app/[lang]/login/actions";

type LoginFormProps = {
  action: (
    state: LoginActionState,
    formData: FormData,
  ) => Promise<LoginActionState>;
  dictionary: {
    heading: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    submitButton: string;
    invalidCredentials: string;
  };
};

const initialState: LoginActionState = {};

export function LoginForm({ action, dictionary }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {dictionary.heading}
      </h1>

      <div className="flex flex-col gap-2">
        <Label htmlFor="username">{dictionary.usernameLabel}</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className="h-10 px-3"
          placeholder={dictionary.usernamePlaceholder}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{dictionary.passwordLabel}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10 px-3"
          placeholder={dictionary.passwordPlaceholder}
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {dictionary.invalidCredentials}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-10">
        {dictionary.submitButton}
      </Button>
    </form>
  );
}

