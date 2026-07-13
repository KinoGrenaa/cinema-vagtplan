"use client";

import { useInfoModal } from "@/app/hooks/useInfoModal";

import { useProfileData } from "./data/useProfileData";
import { useProfileForm } from "./form/useProfileForm";

export function useProfilePage() {
  const infoDialog = useInfoModal();

  const data = useProfileData({
    showError: infoDialog.showError,
  });

  const form = useProfileForm({
    currentUser: data.currentUser,
    fetchProfile: data.fetchProfile,
    profile: data.profile,
    setCurrentUser: data.setCurrentUser,
    showError: infoDialog.showError,
  });

  return {
    infoDialog,
    profile: data.profile,
    loading: data.loading,
    ...form,
  };
}
