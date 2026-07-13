"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import {
  getErrorMessage,
  readErrorMessage,
} from "../../helpers/core/payrollTypeHelpers";
import type { PayrollType } from "../../helpers/core/payrollTypeTypes";

type UsePayrollTypesDataOptions = {
  showError: (title: string, description: string) => void;
};

export function usePayrollTypesData({
  showError,
}: UsePayrollTypesDataOptions) {
  const showErrorRef = useRef(showError);
  const [payrollTypes, setPayrollTypes] = useState<PayrollType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const fetchPayrollTypes = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiFetch("/payroll-types");
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente lønarter"),
        );
      }

      const data = await response.json();
      setPayrollTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      setPayrollTypes([]);
      showErrorRef.current(
        "Kunne ikke hente lønarter",
        getErrorMessage(error, "Lønarterne kunne ikke hentes. Prøv igen."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayrollTypes();
  }, [fetchPayrollTypes]);

  return {
    fetchPayrollTypes,
    loading,
    payrollTypes,
  };
}
