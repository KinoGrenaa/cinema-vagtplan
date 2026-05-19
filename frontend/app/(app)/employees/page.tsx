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

type EmployeeDocument = {
  id: number;
  title: string;
  fileUrl: string;
  fileName: string;
  fileType?: string | null;
  createdAt: string;
};

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("test123");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"MASTER" | "ADMIN" | "EMPLOYEE">("EMPLOYEE");

  const [profileImage, setProfileImage] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [skills, setSkills] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  function getToken() {
    return localStorage.getItem("token");
  }

  const fetchUsers = useCallback(async () => {
    const response = await fetch("http://localhost:3001/users", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data: User[] = await response.json();
    setUsers(data);
  }, []);

  async function fetchDocuments(userId: number) {
    const response = await fetch(
      `http://localhost:3001/employee-documents/user/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );

    const data: EmployeeDocument[] = await response.json();
    setDocuments(data);
  }

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/";
      return;
    }

    const parsedUser: CurrentUser = JSON.parse(savedUser);
    setCurrentUser(parsedUser);

    fetchUsers();
  }, [fetchUsers]);

  function formatDateForInput(value?: string | null) {
    return value ? value.slice(0, 10) : "";
  }

  function resetForm() {
    setSelectedUser(null);
    setEmail("");
    setPassword("test123");
    setFirstName("");
    setLastName("");
    setPhone("");
    setRole("EMPLOYEE");
    setProfileImage("");
    setAddress("");
    setBirthDate("");
    setEmergencyPhone("");
    setHireDate("");
    setSkills("");
    setNotes("");
    setMessage("");
    setDocuments([]);
    setDocumentTitle("");
    setDocumentFile(null);
  }

  function startEdit(user: User) {
    setSelectedUser(user);
    setEmail(user.email);
    setPassword("");
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone || "");
    setRole(user.role);
    setProfileImage(user.profileImage || "");
    setAddress(user.address || "");
    setBirthDate(formatDateForInput(user.birthDate));
    setEmergencyPhone(user.emergencyPhone || "");
    setHireDate(formatDateForInput(user.hireDate));
    setSkills(user.skills || "");
    setNotes(user.notes || "");
    setMessage("");
    fetchDocuments(user.id);
  }

  async function saveEmployee(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!currentUser) return;

    const payload = selectedUser
  ? {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      cinemaId: currentUser.cinemaId,
      profileImage,
      address,
      birthDate: birthDate || null,
      emergencyPhone,
      hireDate: hireDate || null,
      skills,
      notes,
    }
  : {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      cinemaId: currentUser.cinemaId,
    };

    const url = selectedUser
      ? `http://localhost:3001/users/${selectedUser.id}`
      : "http://localhost:3001/users";

    const method = selectedUser ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Der opstod en fejl");
      return;
    }

    setMessage(selectedUser ? "Medarbejder opdateret" : "Medarbejder oprettet");
    resetForm();
    await fetchUsers();
  }

  async function uploadDocument() {
    if (!selectedUser || !documentFile) {
      setMessage("Vælg en fil først");
      return;
    }

    const formData = new FormData();
    formData.append("userId", String(selectedUser.id));
    formData.append("title", documentTitle || documentFile.name);
    formData.append("file", documentFile);

    const response = await fetch(
      "http://localhost:3001/employee-documents/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.message || "Upload fejlede");
      return;
    }

    setDocumentTitle("");
    setDocumentFile(null);
    setMessage("Dokument uploadet");

    await fetchDocuments(selectedUser.id);
  }

  async function deleteDocument(documentId: number) {
    if (!selectedUser) return;

    await fetch(`http://localhost:3001/employee-documents/${documentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    await fetchDocuments(selectedUser.id);
  }

  const canManageEmployees =
    currentUser?.role === "ADMIN" || currentUser?.role === "MASTER";

  return (
    <>
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold">Medarbejdere</h1>
        <p className="text-gray-500">
          Opret, rediger og administrer medarbejderprofiler.
        </p>
      </div>

      {canManageEmployees && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">
            {selectedUser ? "Rediger medarbejder" : "Opret medarbejder"}
          </h2>

          <form
            onSubmit={saveEmployee}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block mb-1 font-medium">Fornavn</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Efternavn</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

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
              <label className="block mb-1 font-medium">Telefon</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">
                {selectedUser
                  ? "Ny adgangskode (valgfri)"
                  : "Midlertidig adgangskode"}
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!selectedUser}
                placeholder={
                  selectedUser
                    ? "Lad feltet være tomt for at beholde adgangskoden"
                    : ""
                }
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Rolle</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "MASTER" | "ADMIN" | "EMPLOYEE")
                }
              >
                <option value="EMPLOYEE">Medarbejder</option>
                <option value="ADMIN">Admin</option>
                <option value="MASTER">Master</option>
              </select>
            </div>

            <div className="md:col-span-2 border-t pt-4 mt-2">
              <h3 className="text-xl font-bold mb-3">Profiloplysninger</h3>
            </div>

            <div>
              <label className="block mb-1 font-medium">
                Profilbillede URL
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://..."
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
              <label className="block mb-1 font-medium">Ansættelsesdato</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
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
              <label className="block mb-1 font-medium">Kompetencer</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Kiosk, billet, teknik..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 font-medium">Noter</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 min-h-24"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {selectedUser && (
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <h3 className="text-xl font-bold mb-3">Dokumenter</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <input
                    className="border rounded-lg px-3 py-2"
                    placeholder="Titel på dokument"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                  />

                  <input
                    type="file"
                    className="border rounded-lg px-3 py-2"
                    onChange={(e) =>
                      setDocumentFile(e.target.files?.[0] || null)
                    }
                  />

                  <button
                    type="button"
                    onClick={uploadDocument}
                    className="bg-black text-white px-4 py-2 rounded-lg"
                  >
                    Upload dokument
                  </button>
                </div>

                <div className="space-y-2">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                    >
                      <div>
                        <div className="font-medium">{document.title}</div>
                        <div className="text-sm text-gray-500">
                          {document.fileName}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-gray-200 px-3 py-2 rounded-lg text-sm"
                        >
                          Åbn
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            const confirmed = window.confirm(
                              "Er du sikker på at du vil slette dokumentet?",
                            );

                            if (confirmed) {
                              deleteDocument(document.id);
                            }
                          }}
                          className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm"
                        >
                          Slet
                        </button>
                      </div>
                    </div>
                  ))}

                  {documents.length === 0 && (
                    <div className="text-sm text-gray-500">
                      Ingen dokumenter endnu.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-black text-white py-3 rounded-lg"
              >
                {selectedUser ? "Gem ændringer" : "Opret medarbejder"}
              </button>

              {selectedUser && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 px-6 py-3 rounded-lg"
                >
                  Annuller
                </button>
              )}
            </div>
          </form>

          {message && (
            <div className="mt-4 bg-gray-100 rounded-lg p-4">{message}</div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Alle medarbejdere</h2>

        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div className="flex gap-4 items-center">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-14 h-14 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center font-bold">
                    {user.firstName.charAt(0)}
                    {user.lastName.charAt(0)}
                  </div>
                )}

                <div>
                  <div className="font-bold">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <div className="text-sm text-gray-500">
                    {user.phone || "Ingen telefon"}
                  </div>
                  {user.skills && (
                    <div className="text-sm text-gray-500">
                      Kompetencer: {user.skills}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm">
                  {user.role}
                </div>

                {canManageEmployees && (
                  <button
                    onClick={() => startEdit(user)}
                    className="bg-black text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Rediger
                  </button>
                )}
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="text-gray-500">Ingen medarbejdere fundet.</div>
          )}
        </div>
      </div>
    </>
  );
}
