"use client";

import { type ChangeEvent, useActionState, useState } from "react";

import type {
  AttendanceAnswer,
  GetPointsActionState,
  GetPointsFormValues,
  ProtocolAnswer,
  YesNoAnswer,
} from "@/app/[lang]/get-points/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
    cancelButton: string;
    saveButton: string;
    noMeetingError: string;
    lastModified: string;
    never: string;
    saveSuccess: string;
    saveError: string;
  };
  formDisabled: boolean;
  showNoMeetingError: boolean;
  meetingId: string | null;
  initialValues: GetPointsFormValues;
  lastModified: string;
};

const initialState: GetPointsActionState = { status: "idle" };

export function GetPointsForm({
  action,
  dictionary,
  formDisabled,
  showNoMeetingError,
  meetingId,
  initialValues,
  lastModified,
}: GetPointsFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [attendance, setAttendance] = useState<AttendanceAnswer>(initialValues.attendance);
  const [protocol, setProtocol] = useState<ProtocolAnswer>(initialValues.protocol);
  const [moderation, setModeration] = useState<YesNoAnswer>(initialValues.moderation);
  const [participation, setParticipation] = useState<YesNoAnswer>(initialValues.participation);
  const [twlPosts, setTwlPosts] = useState<number>(initialValues.twlPosts);
  const [presentations, setPresentations] = useState<number>(initialValues.presentations);

  const isAttendanceNo = attendance === "no";
  const isSubmissionBlocked = formDisabled || pending;

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

  const handleReset = () => {
    setAttendance(initialValues.attendance);
    setProtocol(initialValues.protocol);
    setModeration(initialValues.moderation);
    setParticipation(initialValues.participation);
    setTwlPosts(initialValues.twlPosts);
    setPresentations(initialValues.presentations);
  };

  return (
    <form action={formAction} className="space-y-6">
      {meetingId ? <input type="hidden" name="guildMeetingId" value={meetingId} /> : null}

      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {dictionary.heading}
      </h1>

      {showNoMeetingError ? (
        <p className="text-sm text-destructive" role="alert">
          {dictionary.noMeetingError}
        </p>
      ) : null}

      <fieldset className="space-y-3" disabled={isSubmissionBlocked}>
        <legend className="text-sm font-medium text-foreground">{dictionary.attendanceLabel}</legend>
        <RadioGroup
          name="attendance"
          value={attendance}
          onValueChange={(value) => handleAttendanceChange(value as AttendanceAnswer)}
          disabled={isSubmissionBlocked}
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

      <fieldset className="space-y-3 disabled:opacity-60" disabled={isSubmissionBlocked || isAttendanceNo}>
        <legend className="text-sm font-medium text-foreground">{dictionary.protocolLabel}</legend>
        <RadioGroup
          name="protocol"
          value={protocol}
          onValueChange={(value) => setProtocol(value as ProtocolAnswer)}
          disabled={isSubmissionBlocked || isAttendanceNo}
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

      <fieldset className="space-y-3 disabled:opacity-60" disabled={isSubmissionBlocked || isAttendanceNo}>
        <legend className="text-sm font-medium text-foreground">{dictionary.moderationLabel}</legend>
        <RadioGroup
          name="moderation"
          value={moderation}
          onValueChange={(value) => setModeration(value as YesNoAnswer)}
          disabled={isSubmissionBlocked || isAttendanceNo}
          className="space-y-3"
        >
          <RadioOption id="moderation-no" value="no" label={dictionary.no} />
          <RadioOption id="moderation-yes" value="yes" label={dictionary.yes} />
        </RadioGroup>
      </fieldset>

      <fieldset className="space-y-3" disabled={isSubmissionBlocked}>
        <legend className="text-sm font-medium text-foreground">{dictionary.participationLabel}</legend>
        <RadioGroup
          name="participation"
          value={participation}
          onValueChange={(value) => setParticipation(value as YesNoAnswer)}
          disabled={isSubmissionBlocked}
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
          disabled={isSubmissionBlocked}
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
          disabled={isSubmissionBlocked}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {dictionary.lastModified}: {lastModified || dictionary.never}
        </p>

        <div className="flex flex-col sm:flex-row w-full justify-end gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSubmissionBlocked}
            className="h-10 w-full sm:w-auto"
          >
            {dictionary.cancelButton}
          </Button>
          <Button type="submit" disabled={isSubmissionBlocked} className="h-10 w-full sm:w-auto">
            {dictionary.saveButton}
          </Button>
        </div>
      </div>
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

