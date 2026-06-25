"use client";

import { useCallback, useEffect, useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import ProfileAvatar from "./components/ProfileAvatar";
import ProfileInfo from "./components/ProfileInfo";
import ProfileInput from "./components/ProfileInput";
import { formatDate, formatDateForInput, readError } from "./helpers/profileHelpers";
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
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Min profil</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Se og opdater dine medarbejderoplysninger.
            </p>
          </div>

          <button
            onClick={() => {
              setEditing(!editing);
              setMessage("");
              fillForm(profile);
            }}
            className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            {editing ? "Annuller" : "Rediger profil"}
          </button>
        </div>

        {message && (
          <div className="whitespace-pre-line rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-shrink-0">
              <ProfileAvatar
                apiUrl={API_URL}
                profile={profile}
                profileImage={profileImage}
              />
            </div>

            <div className="grid flex-1 gap-4 md:grid-cols-2">
              <ProfileInfo
                label="Navn"
                value={`${profile.firstName} ${profile.lastName}`}
              />
              <ProfileInfo label="Email" value={profile.email} />
              <ProfileInfo label="Mobil" value={profile.phone || "-"} />
              <ProfileInfo label="Rolle" value={profile.role} />
              <ProfileInfo label="Adresse" value={profile.address || "-"} />
              <ProfileInfo label="Fødselsdato" value={formatDate(profile.birthDate)} />
              <ProfileInfo label="Nødtelefon" value={profile.emergencyPhone || "-"} />
              <ProfileInfo label="Kompetencer" value={profile.skills || "-"} />
            </div>
          </div>
        </section>

        {editing && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-6 text-2xl font-bold">Rediger profil</h2>

            <form onSubmit={saveProfile} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <ProfileInput
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                />
                <ProfileInput
                  label="Ny adgangskode"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Lad feltet være tomt for at beholde adgangskoden"
                  helpText="Password skal være mindst 6 tegn."
                />
                <ProfileInput
                  label="Mobil"
                  value={phone}
                  onChange={(value) => {
                    const onlyNumbers = value.replace(/\D/g, "").slice(0, 8);
                    setPhone(onlyNumbers);
                  }}
                  placeholder="8 cifre"
                  helpText="Mobilnummer skal bestå af præcis 8 cifre."
                />
                <ProfileInput
                  label="Nødtelefon"
                  value={emergencyPhone}
                  onChange={setEmergencyPhone}
                />
                <ProfileInput label="Adresse" value={address} onChange={setAddress} />
                <ProfileInput
                  label="Fødselsdato"
                  type="date"
                  value={birthDate}
                  onChange={setBirthDate}
                />
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-medium">Kompetencer</span>
                <textarea
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        uploadProfileImage(file);
                      }
                    }}
                  />

                  <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-6 text-center transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900">
                    <div className="font-medium text-blue-700 dark:text-blue-200">
                      {uploading
                        ? "Uploader billede..."
                        : "Klik her for at vælge profilbillede"}
                    </div>

                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      JPG, PNG eller WEBP · maks 2 MB
                    </div>

                    {selectedFileName && (
                      <div className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Valgt fil: {selectedFileName}
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setMessage("");
                    fillForm(profile);
                  }}
                  className="rounded-xl bg-gray-200 px-5 py-3 font-medium text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  Annuller
                </button>

                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Gemmer..." : "Gem profil"}
                </button>
              </div>
            </form>
          </section>
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

