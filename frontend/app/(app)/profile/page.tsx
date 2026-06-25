"use client";

import InfoModal from "@/app/components/modals/InfoModal";
import ProfileDetailsSection from "./components/ProfileDetailsSection";
import ProfileEditForm from "./components/ProfileEditForm";
import ProfileHeader from "./components/ProfileHeader";
import ProfileMessage from "./components/ProfileMessage";
import { useProfilePage } from "./hooks/useProfilePage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ProfilePage() {
  const {
    infoDialog,
    profile,
    editing,
    message,
    loading,
    saving,
    email,
    password,
    phone,
    profileImage,
    selectedFileName,
    uploading,
    address,
    birthDate,
    emergencyPhone,
    skills,
    setEmail,
    setPassword,
    setPhone,
    setAddress,
    setBirthDate,
    setEmergencyPhone,
    setSkills,
    toggleEditing,
    cancelEditing,
    uploadProfileImage,
    saveProfile,
  } = useProfilePage();

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
        <ProfileHeader editing={editing} onToggleEdit={toggleEditing} />

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
            onCancel={cancelEditing}
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
