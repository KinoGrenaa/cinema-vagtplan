"use client";

import {
  useEffect,
  useState,
} from "react";

type EmployeeAvatarProps = {
  name: string;
  profileImage?: string | null;
  selected?: boolean;
  className?: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

function getEmployeeInitials(
  name: string,
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const first =
    parts[0]?.[0] ?? "";
  const last =
    parts.length > 1
      ? parts[
          parts.length - 1
        ]?.[0] ?? ""
      : "";

  return (
    first + last
  ).toLocaleUpperCase(
    "da-DK",
  );
}

function resolveProfileImage(
  profileImage?: string | null,
) {
  const value =
    profileImage?.trim() ?? "";

  if (!value) {
    return "";
  }

  if (
    /^https?:\/\//i.test(
      value,
    )
  ) {
    return value;
  }

  return `${API_URL}${
    value.startsWith("/")
      ? value
      : `/${value}`
  }`;
}

export default function EmployeeAvatar({
  name,
  profileImage,
  selected = false,
  className = "",
}: EmployeeAvatarProps) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);

  const imageSrc =
    resolveProfileImage(
      profileImage,
    );

  useEffect(() => {
    setImageFailed(false);
  }, [imageSrc]);

  const baseClass =
    `flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-black ${className}`;

  if (
    imageSrc &&
    !imageFailed
  ) {
    return (
      <span
        className={
          baseClass
        }
      >
        <img
          src={imageSrc}
          alt={`Profilbillede af ${name}`}
          className="h-full w-full object-cover"
          onError={() =>
            setImageFailed(
              true,
            )
          }
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${baseClass} ${
        selected
          ? "bg-blue-600 text-white dark:bg-blue-500"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
      }`}
    >
      {getEmployeeInitials(
        name,
      )}
    </span>
  );
}
