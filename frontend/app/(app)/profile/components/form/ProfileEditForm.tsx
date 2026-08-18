import type { FormEventHandler } from "react";

import ProjectDatePicker from "@/app/components/date/ProjectDatePicker";
import ProfileInput from "./ProfileInput";

type ProfileEditFormProps = {
  address: string;
  birthDate: string;
  email: string;
  emergencyPhone: string;
  password: string;
  phone: string;
  saving: boolean;
  selectedFileName: string;
  skills: string;
  uploading: boolean;
  onAddressChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onCancel: () => void;
  onEmailChange: (value: string) => void;
  onEmergencyPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSkillsChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onUploadProfileImage: (file: File) => void;
};

export default function ProfileEditForm({
  address,
  birthDate,
  email,
  emergencyPhone,
  password,
  phone,
  saving,
  selectedFileName,
  skills,
  uploading,
  onAddressChange,
  onBirthDateChange,
  onCancel,
  onEmailChange,
  onEmergencyPhoneChange,
  onPasswordChange,
  onPhoneChange,
  onSkillsChange,
  onSubmit,
  onUploadProfileImage,
}: ProfileEditFormProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-6 text-2xl font-bold">Rediger profil</h2>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <ProfileInput
            label="Email"
            type="email"
            value={email}
            onChange={onEmailChange}
          />
          <ProfileInput
            label="Ny adgangskode"
            type="password"
            value={password}
            onChange={onPasswordChange}
            placeholder="Lad feltet være tomt for at beholde adgangskoden"
            helpText="Adgangskode skal være mindst 8 tegn."
          />
          <ProfileInput
            label="Mobil"
            value={phone}
            onChange={(value) => {
              const onlyNumbers = value.replace(/\D/g, "").slice(0, 8);
              onPhoneChange(onlyNumbers);
            }}
            placeholder="8 cifre"
            helpText="Mobilnummer skal bestå af præcis 8 cifre."
          />
          <ProfileInput
            label="Nødtelefon"
            value={emergencyPhone}
            onChange={onEmergencyPhoneChange}
          />
          <ProfileInput
            label="Adresse"
            value={address}
            onChange={onAddressChange}
          />
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {"F\u00f8dselsdato"}
            </div>
            <ProjectDatePicker
              value={birthDate}
              onChange={
                onBirthDateChange
              }
              clearable
              ariaLabel={
                "V\u00e6lg f\u00f8dselsdato"
              }
            />
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Kompetencer</span>
          <textarea
            value={skills}
            onChange={(event) => onSkillsChange(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:focus:border-blue-400 dark:focus:ring-blue-400/25"
          />
        </label>

        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <label
            className={`block ${
              uploading ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onUploadProfileImage(file);
                }
              }}
            />
            <div
              className={`rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-6 text-center transition hover:bg-blue-100 active:bg-blue-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 dark:active:bg-blue-800 dark:focus-within:ring-blue-400 dark:focus-within:ring-offset-gray-900 ${
                uploading ? "opacity-60" : ""
              }`}
            >
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

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || uploading}
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Annuller
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-xl bg-blue-700 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            {saving ? "Gemmer..." : "Gem profil"}
          </button>
        </div>
      </form>
    </section>
  );
}
