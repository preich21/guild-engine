"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type AttendanceAnswer = "no" | "virtually" | "onSite";
type ProtocolAnswer = "no" | "forced" | "voluntary";
type YesNoAnswer = "no" | "yes";

type GetPointsFormProps = {
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
    savedAlert: string;
  };
};

export function GetPointsForm({ dictionary }: GetPointsFormProps) {
  const [attendance, setAttendance] = useState<AttendanceAnswer>("no");
  const [protocol, setProtocol] = useState<ProtocolAnswer>("no");
  const [moderation, setModeration] = useState<YesNoAnswer>("no");
  const [participation, setParticipation] = useState<YesNoAnswer>("no");
  const [twlPosts, setTwlPosts] = useState<number>(0);
  const [presentations, setPresentations] = useState<number>(0);

  const isAttendanceNo = attendance === "no";

  const handleAttendanceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextAttendance = event.target.value as AttendanceAnswer;
    setAttendance(nextAttendance);

    if (nextAttendance === "no") {
      setProtocol("no");
      setModeration("no");
    }
  };

  const handleNumberChange =
    (setter: (value: number) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.valueAsNumber;
      setter(Number.isNaN(nextValue) || nextValue < 0 ? 0 : nextValue);
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.alert(dictionary.savedAlert);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {dictionary.heading}
      </h1>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">{dictionary.attendanceLabel}</legend>
        <RadioOption
          name="attendance"
          value="no"
          checked={attendance === "no"}
          onChange={handleAttendanceChange}
          label={dictionary.attendanceNo}
        />
        <RadioOption
          name="attendance"
          value="virtually"
          checked={attendance === "virtually"}
          onChange={handleAttendanceChange}
          label={dictionary.attendanceVirtually}
        />
        <RadioOption
          name="attendance"
          value="onSite"
          checked={attendance === "onSite"}
          onChange={handleAttendanceChange}
          label={dictionary.attendanceOnSite}
        />
      </fieldset>

      <fieldset className="space-y-3" disabled={isAttendanceNo}>
        <legend className="text-sm font-medium text-foreground">{dictionary.protocolLabel}</legend>
        <RadioOption
          name="protocol"
          value="no"
          checked={protocol === "no"}
          onChange={(event) => setProtocol(event.target.value as ProtocolAnswer)}
          label={dictionary.protocolNo}
        />
        <RadioOption
          name="protocol"
          value="forced"
          checked={protocol === "forced"}
          onChange={(event) => setProtocol(event.target.value as ProtocolAnswer)}
          label={dictionary.protocolForced}
        />
        <RadioOption
          name="protocol"
          value="voluntary"
          checked={protocol === "voluntary"}
          onChange={(event) => setProtocol(event.target.value as ProtocolAnswer)}
          label={dictionary.protocolVoluntary}
        />
      </fieldset>

      <fieldset className="space-y-3" disabled={isAttendanceNo}>
        <legend className="text-sm font-medium text-foreground">{dictionary.moderationLabel}</legend>
        <RadioOption
          name="moderation"
          value="no"
          checked={moderation === "no"}
          onChange={(event) => setModeration(event.target.value as YesNoAnswer)}
          label={dictionary.no}
        />
        <RadioOption
          name="moderation"
          value="yes"
          checked={moderation === "yes"}
          onChange={(event) => setModeration(event.target.value as YesNoAnswer)}
          label={dictionary.yes}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">{dictionary.participationLabel}</legend>
        <RadioOption
          name="participation"
          value="no"
          checked={participation === "no"}
          onChange={(event) => setParticipation(event.target.value as YesNoAnswer)}
          label={dictionary.no}
        />
        <RadioOption
          name="participation"
          value="yes"
          checked={participation === "yes"}
          onChange={(event) => setParticipation(event.target.value as YesNoAnswer)}
          label={dictionary.yes}
        />
      </fieldset>

      <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
        <span>{dictionary.twlPostsLabel}</span>
        <input
          name="twlPosts"
          type="number"
          min={0}
          value={twlPosts}
          onChange={handleNumberChange(setTwlPosts)}
          className="h-10 rounded-md border border-input bg-background px-3 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
        <span>{dictionary.presentationsLabel}</span>
        <input
          name="presentations"
          type="number"
          min={0}
          value={presentations}
          onChange={handleNumberChange(setPresentations)}
          className="h-10 rounded-md border border-input bg-background px-3 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <Button type="submit" className="h-10 w-full sm:w-auto">
        {dictionary.saveButton}
      </Button>
    </form>
  );
}

type RadioOptionProps = {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function RadioOption({ name, value, checked, label, onChange }: RadioOptionProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 border-input bg-background text-primary"
      />
      <span>{label}</span>
    </label>
  );
}

