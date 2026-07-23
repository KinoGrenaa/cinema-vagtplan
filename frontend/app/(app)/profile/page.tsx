"use client";

import InfoModal from "@/app/components/modals/InfoModal";

import ProfileDetailsSection from "./components/details/ProfileDetailsSection";
import ProfileMessage from "./components/feedback/ProfileMessage";
import ProfileEditForm from "./components/form/ProfileEditForm";
import ProfileHeader from "./components/layout/ProfileHeader";
import { useProfilePage } from "./hooks/useProfilePage";
import styles from "./ProfilePage.module.css";

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
      <main
        className={`${styles.page} min-h-screen p-4 text-gray-900 transition-colors dark:text-gray-100 md:p-8`}
      >
        <div
          className={`${styles.stateCard} mx-auto max-w-4xl`}
          role="status"
          aria-live="polite"
        >
          Indlæser profil...
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main
        className={`${styles.page} min-h-screen p-4 text-gray-900 transition-colors dark:text-gray-100 md:p-8`}
      >
        <div
          className={`${styles.stateCard} ${styles.errorCard} mx-auto max-w-4xl`}
          role="alert"
        >
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
    <main
      className={`${styles.page} min-h-screen p-4 text-gray-900 transition-colors dark:text-gray-100 md:p-8`}
    >
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
