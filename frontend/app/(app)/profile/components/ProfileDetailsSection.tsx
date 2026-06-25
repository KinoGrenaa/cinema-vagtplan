import { formatDate } from "../helpers/profileHelpers";
import type { User } from "../helpers/profileTypes";
import ProfileAvatar from "./ProfileAvatar";
import ProfileInfo from "./ProfileInfo";

type ProfileDetailsSectionProps = {
  apiUrl: string;
  profile: User;
  profileImage: string;
};

export default function ProfileDetailsSection({
  apiUrl,
  profile,
  profileImage,
}: ProfileDetailsSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-shrink-0">
          <ProfileAvatar
            apiUrl={apiUrl}
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
  );
}
