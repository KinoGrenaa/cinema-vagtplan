"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Dispatch,
  FormEvent,
  SetStateAction,
} from "react";
import { apiFetch } from "@/app/lib/api";
import {
  formatDateForInput,
  readError,
} from "../../helpers/profileHelpers";
import type { CurrentUser, User } from "../../helpers/profileTypes";

type UseProfileFormOptions = {
  currentUser: CurrentUser | null;
  fetchProfile: () => Promise<void>;
  profile: User | null;
  setCurrentUser: Dispatch<SetStateAction<CurrentUser | null>>;
  showError: (title: string, description: string) => void;
};

export function useProfileForm({
  currentUser,
  fetchProfile,
  profile,
  setCurrentUser,
  showError,
}: UseProfileFormOptions) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [skills, setSkills] = useState("");

  const fillForm = useCallback((user: User) => {
    setEmail(user.email || "");
    setPassword("");
    setPhone(user.phone || "");
    setProfileImage(user.profileImage || "");
    setSelectedFileName("");
    setAddress(user.address || "");
    setBirthDate(formatDateForInput(user.birthDate));
    setEmergencyPhone(user.emergencyPhone || "");
    setSkills(user.skills || "");
  }, []);

  useEffect(() => {
    if (profile) {
      fillForm(profile);
    }
  }, [fillForm, profile]);

  async function uploadProfileImage(file: File) {
    if (!currentUser) return;

    if (file.size > 2 * 1024 * 1024) {
      showError(
        "Profilbillede kunne ikke uploades",
        "Profilbilledet må maks være 2 MB.",
      );
      return;
    }

    try {
      setUploading(true);
      setMessage("");
      setSelectedFileName(file.name);

      const formData = new FormData();
      formData.append("file", file);

      const response = await apiFetch(
        `/users/${currentUser.id}/profile-image`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();
      setProfileImage(data.imageUrl);
      setSelectedFileName("");
      setMessage("Profilbilledet er opdateret.");
      await fetchProfile();
    } catch (error) {
      showError(
        "Upload af billede fejlede",
        error instanceof Error
          ? error.message
          : "Upload af billede fejlede.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();

    if (!currentUser) return;

    if (password && password.length < 8) {
      showError(
        "Profilen kunne ikke gemmes",
        "Adgangskode skal være mindst 8 tegn.",
      );
      return;
    }

    const mobileDigits = phone.replace(/\D/g, "");

    if (
      mobileDigits.length > 0 &&
      mobileDigits.length !== 8
    ) {
      showError(
        "Profilen kunne ikke gemmes",
        "Mobilnummer skal bestå af præcis 8 cifre.",
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(
        `/users/${currentUser.id}/profile`,
        {
          method: "PATCH",
          body: JSON.stringify({
            email: email.trim(),
            password: password.trim() || undefined,
            phone: mobileDigits || undefined,
            address: address.trim() || undefined,
            birthDate: birthDate || null,
            emergencyPhone:
              emergencyPhone.trim() || undefined,
            skills: skills.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();

      const updatedCurrentUser = {
        ...currentUser,
        email: data.email,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedCurrentUser),
      );
      setCurrentUser(updatedCurrentUser);
      setMessage("Profil opdateret.");
      setEditing(false);
      setPassword("");
      setSelectedFileName("");
      await fetchProfile();
    } catch (error) {
      showError(
        "Profilen kunne ikke gemmes",
        error instanceof Error
          ? error.message
          : "Kunne ikke gemme profil.",
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleEditing() {
    if (!profile) return;

    setEditing(!editing);
    setMessage("");
    fillForm(profile);
  }

  function cancelEditing() {
    if (!profile) return;

    setEditing(false);
    setMessage("");
    fillForm(profile);
  }

  return {
    address,
    birthDate,
    cancelEditing,
    editing,
    email,
    emergencyPhone,
    message,
    password,
    phone,
    profileImage:
      profileImage || profile?.profileImage || "",
    saveProfile,
    saving,
    selectedFileName,
    setAddress,
    setBirthDate,
    setEmail,
    setEmergencyPhone,
    setPassword,
    setPhone,
    setSkills,
    skills,
    toggleEditing,
    uploadProfileImage,
    uploading,
  };
}
