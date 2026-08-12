"use client";

import {
  useCallback,
  useState,
} from "react";

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

  const show = useCallback((input: InfoModalInput) => {
    setConfig(input);
    setOpen(true);
  }, []);

  const showError = useCallback(
    (title: string, description: string) => {
      show({
        title,
        description,
        variant: "error",
        buttonText: "OK",
      });
    },
    [show],
  );

  const showSuccess = useCallback(
    (title: string, description: string) => {
      show({
        title,
        description,
        variant: "success",
        buttonText: "OK",
      });
    },
    [show],
  );

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    title: config?.title ?? "",
    description: config?.description ?? "",
    buttonText: config?.buttonText ?? "OK",
    variant: config?.variant ?? "info",
    show,
    showError,
    showSuccess,
    close,
  };
}
