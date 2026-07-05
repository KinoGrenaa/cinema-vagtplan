export type JobFunctionConfirmVariant = "danger" | "success";

export type JobFunctionConfirm = (options: {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: JobFunctionConfirmVariant;
  onConfirm: () => Promise<void> | void;
}) => void;

export type JobFunctionShowError = (
  title: string,
  description: string,
) => void;

export type JobFunctionShowInfo = (options: {
  title: string;
  description: string;
  variant: "success";
  buttonText: string;
}) => void;
