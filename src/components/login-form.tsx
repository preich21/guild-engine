"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
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

      <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
        <span>{dictionary.usernameLabel}</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          required
          className="h-10 rounded-md border border-input bg-background px-3 text-base outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={dictionary.usernamePlaceholder}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
        <span>{dictionary.passwordLabel}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10 rounded-md border border-input bg-background px-3 text-base outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={dictionary.passwordPlaceholder}
        />
      </label>

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

