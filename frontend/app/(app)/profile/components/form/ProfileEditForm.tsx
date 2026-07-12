import type { FormEventHandler } from "react";

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

          <ProfileInput
            label="Fødselsdato"
            type="date"
            value={birthDate}
            onChange={onBirthDateChange}
          />
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Kompetencer</span>
          <textarea
            value={skills}
            onChange={(event) => onSkillsChange(event.target.value)}
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
                  onUploadProfileImage(file);
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
            onClick={onCancel}
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
  );
}
