"use client";

import {
  useEffect,
  useState,
} from "react";

import ProjectDatePicker from "./ProjectDatePicker";
import ProjectTimePicker, {
  type ProjectTimePickerMinuteStep,
} from "./ProjectTimePicker";

type ProjectDateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  clearable?: boolean;
  min?: string;
  max?: string;
  minuteStep?: ProjectTimePickerMinuteStep;
  pickerOnly?: boolean;
  ariaLabel?: string;
  className?: string;
};

function splitDateTime(
  value: string,
) {
  if (
    !value ||
    !value.includes("T")
  ) {
    return {
      date: "",
      time: "",
    };
  }

  const [
    date,
    timePart = "",
  ] =
    value.split("T");

  return {
    date,
    time:
      timePart.slice(
        0,
        5,
      ),
  };
}

export default function ProjectDateTimePicker({
  value,
  onChange,
  disabled = false,
  clearable = false,
  min,
  max,
  minuteStep = 1,
  pickerOnly = false,
  ariaLabel = "V\u00e6lg dato og tidspunkt",
  className = "",
}: ProjectDateTimePickerProps) {
  const parsed =
    splitDateTime(
      value,
    );

  const [
    draftDate,
    setDraftDate,
  ] =
    useState(
      parsed.date,
    );

  const [
    draftTime,
    setDraftTime,
  ] =
    useState(
      parsed.time,
    );

  useEffect(() => {
    const next =
      splitDateTime(
        value,
      );

    setDraftDate(
      next.date,
    );

    setDraftTime(
      next.time,
    );
  }, [value]);

  const minDate =
    min
      ? min.slice(0, 10)
      : undefined;

  const maxDate =
    max
      ? max.slice(0, 10)
      : undefined;

  const minTime =
    min &&
    draftDate ===
      min.slice(0, 10)
      ? min.slice(11, 16)
      : undefined;

  const maxTime =
    max &&
    draftDate ===
      max.slice(0, 10)
      ? max.slice(11, 16)
      : undefined;

  function commit(
    date: string,
    time: string,
  ) {
    if (
      date &&
      time
    ) {
      onChange(
        date +
          "T" +
          time,
      );
    }
  }

  function handleDateChange(
    nextDate: string,
  ) {
    setDraftDate(
      nextDate,
    );

    if (!nextDate) {
      setDraftTime("");
      onChange("");
      return;
    }

    commit(
      nextDate,
      draftTime,
    );
  }

  function handleTimeChange(
    nextTime: string,
  ) {
    setDraftTime(
      nextTime,
    );

    if (!nextTime) {
      onChange("");
      return;
    }

    commit(
      draftDate,
      nextTime,
    );
  }

  return (
    <div
      className={
        `grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem] ${className}`
      }
    >
      <ProjectDatePicker
        value={draftDate}
        onChange={
          handleDateChange
        }
        min={minDate}
        max={maxDate}
        disabled={disabled}
        clearable={
          clearable
        }
        ariaLabel={
          ariaLabel
        }
      />

      <ProjectTimePicker
        value={draftTime}
        min={minTime}
        max={maxTime}
        disabled={disabled}
        clearable={clearable}
        minuteStep={minuteStep}
        pickerOnly={pickerOnly}
        onChange={handleTimeChange}
        ariaLabel={"V\u00e6lg klokkesl\u00e6t"}
      />
    </div>
  );
}
