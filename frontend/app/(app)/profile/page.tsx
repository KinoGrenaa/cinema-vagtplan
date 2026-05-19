"use client";

import { useCallback, useEffect, useState } from "react";

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
  hireDate?: string | null;
  skills?: string | null;
  notes?: string | null;
};

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [skills, setSkills] = useState("");

  function getToken() {
    return localStorage.getItem("token");
  }

  function formatDateForInput(value?: string | null) {
    return value ? value.slice(0, 10) : "";
  }

  function fillForm(user: User) {
    setEmail(user.email);
    setPassword("");
    setPhone(user.phone || "");
    setProfileImage(user.profileImage || "");
    setAddress(user.address || "");
    setBirthDate(formatDateForInput(user.birthDate));
    setEmergencyPhone(user.emergencyPhone || "");
    setSkills(user.skills || "");
  }

  const fetchProfile = useCallback(async () => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/";
      return;
    }

    const parsedUser: CurrentUser = JSON.parse(savedUser);
    setCurrentUser(parsedUser);

    const response = await fetch("http://localhost:3001/users", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const users: User[] = await response.json();
    const me = users.find((user) => user.id === parsedUser.id) || null;

    setProfile(me);

    if (me) {
      fillForm(me);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  function formatDate(value?: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("da-DK");
  }
  async function uploadProfileImage(file: File) {
    if (!currentUser) return;

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `http://localhost:3001/users/${currentUser.id}/profile-image`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      },
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Upload fejlede");
      setUploading(false);
      return;
    }

    setProfileImage(data.imageUrl);
    setMessage("Billede uploadet. Husk at gemme profilen.");
    setUploading(false);
  }
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!currentUser) return;

    const response = await fetch(
      `http://localhost:3001/users/${currentUser.id}/profile`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          email,
          password,
          phone,
          profileImage,
          address,
          birthDate: birthDate || null,
          emergencyPhone,
          skills,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Der opstod en fejl");
      return;
    }

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...currentUser,
        email: data.email,
      }),
    );

    setMessage("Profil opdateret");
    setEditing(false);
    await fetchProfile();
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-xl shadow p-6">Indlæser profil...</div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Min profil</h1>
          <p className="text-gray-500">Dine medarbejderoplysninger.</p>
        </div>

        <button
          onClick={() => {
            setEditing(!editing);
            setMessage("");
            fillForm(profile);
          }}
          className="bg-black text-white px-5 py-3 rounded-lg"
        >
          {editing ? "Annuller" : "Rediger profil"}
        </button>
      </div>

      {message && (
        <div className="bg-gray-100 rounded-xl p-4 mb-6">{message}</div>
      )}

      {editing && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Rediger profil</h2>

          <form
            onSubmit={saveProfile}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block mb-1 font-medium">Email</label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Ny adgangskode</label>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Lad feltet være tomt for at beholde adgangskoden"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Telefon</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Nødtelefon</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Adresse</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Fødselsdato</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div>
              <div>
                <label className="block mb-1 font-medium">Profilbillede</label>

                <input
                  type="file"
                  accept="image/*"
                  className="w-full border rounded-lg px-3 py-2"
                  onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (file) {
                      uploadProfileImage(file);
                    }
                  }}
                />

                {uploading && (
                  <div className="text-sm text-gray-500 mt-2">Uploader...</div>
                )}

                {profileImage && (
                  <div className="mt-3">
                    <img
                      src={profileImage}
                      alt="Profilbillede preview"
                      className="w-24 h-24 rounded-full object-cover border"
                    />
                  </div>
                )}
              </div>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Kompetencer</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Kiosk, billet, teknik..."
              />
            </div>

            <button
              type="submit"
              className="md:col-span-2 bg-black text-white py-3 rounded-lg"
            >
              Gem profil
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div>
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="w-32 h-32 rounded-full object-cover border"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-4xl font-bold">
                {profile.firstName.charAt(0)}
                {profile.lastName.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-3xl font-bold">
              {profile.firstName} {profile.lastName}
            </h2>

            <p className="text-gray-500 mb-6">{profile.role}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Info label="Email" value={profile.email} />
              <Info label="Telefon" value={profile.phone || "-"} />
              <Info label="Adresse" value={profile.address || "-"} />
              <Info label="Fødselsdato" value={formatDate(profile.birthDate)} />
              <Info label="Nødtelefon" value={profile.emergencyPhone || "-"} />
              <Info
                label="Ansættelsesdato"
                value={formatDate(profile.hireDate)}
              />
              <Info label="Kompetencer" value={profile.skills || "-"} />
              <Info label="Noter" value={profile.notes || "-"} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-xl p-4 bg-gray-50">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-medium whitespace-pre-wrap">{value}</div>
    </div>
  );
}
