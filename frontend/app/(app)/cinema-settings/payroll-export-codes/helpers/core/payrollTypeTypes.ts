export type PayrollType = {
  id: number;
  name: string;
  payrollCode: string;
  exportCode?: string | null;
  description?: string | null;
  color?: string | null;
  isDefault: boolean;
  isActive: boolean;
};
