import type { User } from "../helpers/profileTypes";

type ProfileAvatarProps = {
  apiUrl: string;
  profile: User;
  profileImage: string;
};

export default function ProfileAvatar({
  apiUrl,
  profile,
  profileImage,
}: ProfileAvatarProps) {
  const rawImageUrl = profileImage || profile.profileImage || "";

  const imageSrc = rawImageUrl
    ? rawImageUrl.startsWith("http")
      ? rawImageUrl
      : `${apiUrl}${rawImageUrl}`
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
}
