"use client";

import { type ChangeEvent, useActionState, useState } from "react";

import type { GetPointsActionState } from "@/app/[lang]/get-points/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type AttendanceAnswer = "no" | "virtually" | "onSite";
type ProtocolAnswer = "no" | "forced" | "voluntary";
type YesNoAnswer = "no" | "yes";

type GetPointsFormProps = {
  action: (
    state: GetPointsActionState,
    formData: FormData,
  ) => Promise<GetPointsActionState>;
  dictionary: {
    heading: string;
    attendanceLabel: string;
    attendanceNo: string;
    attendanceVirtually: string;
    attendanceOnSite: string;
    protocolLabel: string;
    protocolNo: string;
    protocolForced: string;
    protocolVoluntary: string;
    moderationLabel: string;
    yes: string;
    no: string;
    participationLabel: string;
    twlPostsLabel: string;
    presentationsLabel: string;
    saveButton: string;
    saveSuccess: string;
    saveError: string;
  };
};

const initialState: GetPointsActionState = { status: "idle" };

export function GetPointsForm({ action, dictionary }: GetPointsFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [attendance, setAttendance] = useState<AttendanceAnswer>("no");
  const [protocol, setProtocol] = useState<ProtocolAnswer>("no");
  const [moderation, setModeration] = useState<YesNoAnswer>("no");
  const [participation, setParticipation] = useState<YesNoAnswer>("no");
  const [twlPosts, setTwlPosts] = useState<number>(0);
  const [presentations, setPresentations] = useState<number>(0);

  const isAttendanceNo = attendance === "no";

  const handleAttendanceChange = (nextAttendance: AttendanceAnswer) => {
    setAttendance(nextAttendance);

    if (nextAttendance === "no") {
      setProtocol("no");
      setModeration("no");
    }
  };

  const handleNumberChange =
    (setter: (value: number) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.valueAsNumber;
      if (Number.isNaN(nextValue)) {
        setter(0);
        return;
      }

      setter(Math.min(99, Math.max(0, nextValue)));
    };

  return (
    <form action={formAction} className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {dictionary.heading}
      </h1>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">{dictionary.attendanceLabel}</legend>
        <RadioGroup
          name="attendance"
          value={attendance}
          onValueChange={(value) => handleAttendanceChange(value as AttendanceAnswer)}
          className="space-y-3"
        >
          <RadioOption id="attendance-no" value="no" label={dictionary.attendanceNo} />
          <RadioOption
            id="attendance-virtually"
            value="virtually"
            label={dictionary.attendanceVirtually}
          />
          <RadioOption id="attendance-on-site" value="onSite" label={dictionary.attendanceOnSite} />
        </RadioGroup>
      </fieldset>

      <fieldset className="space-y-3 disabled:opacity-60" disabled={isAttendanceNo}>
        <legend className="text-sm font-medium text-foreground">{dictionary.protocolLabel}</legend>
        <RadioGroup
          name="protocol"
          value={protocol}
          onValueChange={(value) => setProtocol(value as ProtocolAnswer)}
          disabled={isAttendanceNo}
          className="space-y-3"
        >
          <RadioOption id="protocol-no" value="no" label={dictionary.protocolNo} />
          <RadioOption id="protocol-forced" value="forced" label={dictionary.protocolForced} />
          <RadioOption
            id="protocol-voluntary"
            value="voluntary"
            label={dictionary.protocolVoluntary}
          />
        </RadioGroup>
      </fieldset>

      <fieldset className="space-y-3 disabled:opacity-60" disabled={isAttendanceNo}>
        <legend className="text-sm font-medium text-foreground">{dictionary.moderationLabel}</legend>
        <RadioGroup
          name="moderation"
          value={moderation}
          onValueChange={(value) => setModeration(value as YesNoAnswer)}
          disabled={isAttendanceNo}
          className="space-y-3"
        >
          <RadioOption id="moderation-no" value="no" label={dictionary.no} />
          <RadioOption id="moderation-yes" value="yes" label={dictionary.yes} />
        </RadioGroup>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">{dictionary.participationLabel}</legend>
        <RadioGroup
          name="participation"
          value={participation}
          onValueChange={(value) => setParticipation(value as YesNoAnswer)}
          className="space-y-3"
        >
          <RadioOption id="participation-no" value="no" label={dictionary.no} />
          <RadioOption id="participation-yes" value="yes" label={dictionary.yes} />
        </RadioGroup>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="twlPosts">{dictionary.twlPostsLabel}</Label>
        <Input
          id="twlPosts"
          name="twlPosts"
          type="number"
          min={0}
          max={99}
          value={twlPosts}
          onChange={handleNumberChange(setTwlPosts)}
          className="h-10 px-3"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="presentations">{dictionary.presentationsLabel}</Label>
        <Input
          id="presentations"
          name="presentations"
          type="number"
          min={0}
          max={99}
          value={presentations}
          onChange={handleNumberChange(setPresentations)}
          className="h-10 px-3"
          required
        />
      </div>

      {state.status === "success" ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {dictionary.saveSuccess}
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {dictionary.saveError}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-10 w-full sm:w-auto">
        {dictionary.saveButton}
      </Button>
    </form>
  );
}

type RadioOptionProps = {
  id: string;
  value: string;
  label: string;
};

function RadioOption({ id, value, label }: RadioOptionProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-foreground">
      <RadioGroupItem id={id} value={value} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

