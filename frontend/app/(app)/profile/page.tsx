"use client";

import { useCallback, useEffect, useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import ProfileDetailsSection from "./components/ProfileDetailsSection";
import ProfileEditForm from "./components/ProfileEditForm";
import ProfileHeader from "./components/ProfileHeader";
import ProfileMessage from "./components/ProfileMessage";
import { formatDateForInput, readError } from "./helpers/profileHelpers";
import type { CurrentUser, User } from "./helpers/profileTypes";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ProfilePage() {
  const infoDialog = useInfoModal();

  const [profile, setProfile] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
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

  function fillForm(user: User) {
    setEmail(user.email || "");
    setPassword("");
    setPhone(user.phone || "");
    setProfileImage(user.profileImage || "");
    setSelectedFileName("");
    setAddress(user.address || "");
    setBirthDate(formatDateForInput(user.birthDate));
    setEmergencyPhone(user.emergencyPhone || "");
    setSkills(user.skills || "");
  }

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

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
      fillForm(me);
    } catch (error) {
      setProfile(null);
      setMessage("");
      infoDialog.showError(
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

  async function uploadProfileImage(file: File) {
    if (!currentUser) return;

    if (file.size > 2 * 1024 * 1024) {
      infoDialog.showError(
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
      setMessage("Billede uploadet. Husk at gemme profilen.");
    } catch (error) {
      infoDialog.showError(
        "Upload af billede fejlede",
        error instanceof Error ? error.message : "Upload af billede fejlede.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();

    if (!currentUser) return;

    if (password && password.length < 6) {
      infoDialog.showError(
        "Profilen kunne ikke gemmes",
        "Adgangskoden skal være mindst 6 tegn.",
      );
      return;
    }

    const mobileDigits = phone.replace(/\D/g, "");

    if (mobileDigits.length > 0 && mobileDigits.length !== 8) {
      infoDialog.showError(
        "Profilen kunne ikke gemmes",
        "Mobilnummer skal bestå af præcis 8 cifre.",
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(`/users/${currentUser.id}/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim() || undefined,
          phone: mobileDigits || undefined,
          profileImage: profileImage || undefined,
          address: address.trim() || undefined,
          birthDate: birthDate || null,
          emergencyPhone: emergencyPhone.trim() || undefined,
          skills: skills.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();

      const updatedCurrentUser = {
        ...currentUser,
        email: data.email,
      };

      localStorage.setItem("user", JSON.stringify(updatedCurrentUser));
      setCurrentUser(updatedCurrentUser);

      setMessage("Profil opdateret.");
      setEditing(false);
      setPassword("");
      setSelectedFileName("");

      await fetchProfile();
    } catch (error) {
      infoDialog.showError(
        "Profilen kunne ikke gemmes",
        error instanceof Error ? error.message : "Kunne ikke gemme profil.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          Indlæser profil...
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-6 text-red-600 shadow-sm dark:border-red-900 dark:bg-gray-900">
          Kunne ikke hente profil.
        </div>

        <InfoModal
          open={infoDialog.open}
          title={infoDialog.title}
          description={infoDialog.description}
          buttonText={infoDialog.buttonText}
          variant={infoDialog.variant}
          onClose={infoDialog.close}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <ProfileHeader
          editing={editing}
          onToggleEdit={() => {
            setEditing(!editing);
            setMessage("");
            fillForm(profile);
          }}
        />

        <ProfileMessage message={message} />

        <ProfileDetailsSection
          apiUrl={API_URL}
          profile={profile}
          profileImage={profileImage}
        />

        {editing && (
          <ProfileEditForm
            address={address}
            birthDate={birthDate}
            email={email}
            emergencyPhone={emergencyPhone}
            password={password}
            phone={phone}
            saving={saving}
            selectedFileName={selectedFileName}
            skills={skills}
            uploading={uploading}
            onAddressChange={setAddress}
            onBirthDateChange={setBirthDate}
            onCancel={() => {
              setEditing(false);
              setMessage("");
              fillForm(profile);
            }}
            onEmailChange={setEmail}
            onEmergencyPhoneChange={setEmergencyPhone}
            onPasswordChange={setPassword}
            onPhoneChange={setPhone}
            onSkillsChange={setSkills}
            onSubmit={saveProfile}
            onUploadProfileImage={uploadProfileImage}
          />
        )}
      </div>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </main>
  );
}
