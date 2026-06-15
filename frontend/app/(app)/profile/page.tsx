"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  profileImage?: string | null;
  address?: string | null;
  birthDate?: string | null;
  emergencyPhone?: string | null;
  skills?: string | null;
};

type CurrentUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  cinemaId: number;
};

export default function ProfilePage() {
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

  function formatDateForInput(value?: string | null) {
    return value ? value.slice(0, 10) : "";
  }

  function formatDate(value?: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("da-DK");
  }

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

  async function readError(response: Response) {
    try {
      const data = await response.json();

      if (Array.isArray(data.message)) {
        return data.message.join("\n");
      }

      return data.message || "Der opstod en fejl.";
    } catch {
      return "Der opstod en fejl.";
    }
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

      const response = await apiFetch("/users");

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const users: User[] = await response.json();
      const me = users.find((user) => user.id === parsedUser.id) || null;

      if (!me) {
        throw new Error("Kunne ikke finde din profil.");
      }

      setProfile(me);
      fillForm(me);
    } catch (error) {
      setMessage(
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
      setMessage("Profilbilledet må maks være 2 MB.");
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
      setMessage(
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
      setMessage("Password skal være mindst 6 tegn.");
      return;
    }

    const mobileDigits = phone.replace(/\D/g, "");

    if (mobileDigits.length > 0 && mobileDigits.length !== 8) {
      setMessage("Mobilnummer skal bestå af præcis 8 cifre.");
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
      setMessage(
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
          {message || "Kunne ikke hente profil."}
        </div>
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
              {(() => {
                const rawImageUrl = profileImage || profile.profileImage || "";

                const imageSrc = rawImageUrl
                  ? rawImageUrl.startsWith("http")
                    ? rawImageUrl
                    : `${API_URL}${rawImageUrl}`
                  : "";

                return imageSrc ? (
                  <img
                    src={imageSrc}
                    alt="Profilbillede"
                    className="h-32 w-32 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-gray-200 text-3xl font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {profile.firstName.slice(0, 1)}
                    {profile.lastName.slice(0, 1)}
                  </div>
                );
              })()}
            </div>

            <div className="grid flex-1 gap-4 md:grid-cols-2">
              <Info
                label="Navn"
                value={`${profile.firstName} ${profile.lastName}`}
              />
              <Info label="Email" value={profile.email} />
              <Info label="Mobil" value={profile.phone || "-"} />
              <Info label="Rolle" value={profile.role} />
              <Info label="Adresse" value={profile.address || "-"} />
              <Info label="Fødselsdato" value={formatDate(profile.birthDate)} />
              <Info label="Nødtelefon" value={profile.emergencyPhone || "-"} />
              <Info label="Kompetencer" value={profile.skills || "-"} />
            </div>
          </div>
        </section>

        {editing && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-6 text-2xl font-bold">Rediger profil</h2>

            <form onSubmit={saveProfile} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                />
                <Input
                  label="Ny adgangskode"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Lad feltet være tomt for at beholde adgangskoden"
                  helpText="Password skal være mindst 6 tegn."
                />
                <Input
                  label="Mobil"
                  value={phone}
                  onChange={(value) => {
                    const onlyNumbers = value.replace(/\D/g, "").slice(0, 8);
                    setPhone(onlyNumbers);

                    if (onlyNumbers.length > 0 && onlyNumbers.length !== 8) {
                      setMessage("Mobilnummer skal bestå af præcis 8 cifre.");
                    } else {
                      setMessage("");
                    }
                  }}
                  placeholder="8 cifre"
                  helpText="Mobilnummer skal bestå af præcis 8 cifre."
                />
                <Input
                  label="Nødtelefon"
                  value={emergencyPhone}
                  onChange={setEmergencyPhone}
                />
                <Input label="Adresse" value={address} onChange={setAddress} />
                <Input
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
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  helpText?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
      />
      {helpText && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </span>
      )}
    </label>
  );
}
