export type User = {
  id: number;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
  role?: string;
};

export type ErrorDialogState = {
  open: boolean;
  title: string;
  description: string;
};
