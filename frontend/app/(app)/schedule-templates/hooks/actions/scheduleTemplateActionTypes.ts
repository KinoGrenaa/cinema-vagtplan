export type InfoDialogLike = {
  show: (options: {
    title: string;
    description: string;
    variant: "success" | "error" | "warning" | "info";
    buttonText: string;
  }) => void;
  showError: (title: string, description: string) => void;
};
