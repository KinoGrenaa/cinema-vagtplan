"use client";

import { useState } from "react";

type InfoModalVariant = "info" | "error" | "success" | "warning";

type InfoModalInput = {
  title: string;
  description: string;
  buttonText?: string;
  variant?: InfoModalVariant;
};

export function useInfoModal() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<InfoModalInput | null>(null);

  function show(input: InfoModalInput) {
    setConfig(input);
    setOpen(true);
  }

  function showError(title: string, description: string) {
    show({
      title,
      description,
      variant: "error",
      buttonText: "OK",
    });
  }

  function close() {
    setOpen(false);
  }

  return {
    open,
    title: config?.title ?? "",
    description: config?.description ?? "",
    buttonText: config?.buttonText ?? "OK",
    variant: config?.variant ?? "info",
    show,
    showError,
    close,
  };
}
