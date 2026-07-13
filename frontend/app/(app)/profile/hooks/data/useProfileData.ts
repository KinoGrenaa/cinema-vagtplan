"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import { readError } from "../../helpers/profileHelpers";
import type { CurrentUser, User } from "../../helpers/profileTypes";

type UseProfileDataOptions = {
  showError: (title: string, description: string) => void;
};

export function useProfileData({ showError }: UseProfileDataOptions) {
  const showErrorRef = useRef(showError);
  const [profile, setProfile] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);

      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        window.location.href = "/";
        return;
      }

      const parsedUser: CurrentUser = JSON.parse(savedUser);
      setCurrentUser(parsedUser);

      const response = await apiFetch("/users/me/profile");

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const me: User = await response.json();
      setProfile(me);
    } catch (error) {
      setProfile(null);
      showErrorRef.current(
        "Profilen kunne ikke hentes",
        error instanceof Error ? error.message : "Kunne ikke hente profil.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    currentUser,
    fetchProfile,
    loading,
    profile,
    setCurrentUser,
  };
}
