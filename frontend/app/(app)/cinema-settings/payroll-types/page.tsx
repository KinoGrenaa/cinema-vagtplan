import { redirect } from "next/navigation";

export default function RetiredPayrollTypesPage() {
  redirect("/cinema-settings/payroll-export-codes?migratedFrom=payroll-types");
}
