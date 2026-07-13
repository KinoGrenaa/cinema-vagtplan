"use client";

import { useState } from "react";
import PermissionGuard from "@/app/components/access/PermissionGuard";

import ConfirmModal from "@/app/components/modals/ConfirmModal";

import InfoModal from "@/app/components/modals/InfoModal";

import { useConfirm } from "@/app/hooks/useConfirm";

import { useInfoModal } from "@/app/hooks/useInfoModal";

import { EditUserModal, UserModal } from "./components/form/UserFormModal";

import UsersHeader from "./components/layout/UsersHeader";

import UsersMasterCinemaRequired from "./components/layout/UsersMasterCinemaRequired";
import UsersTable from "./components/list/UsersTable";

import { useUserFormActions } from "./hooks/actions/useUserFormActions";

import { useUserStatusActions } from "./hooks/actions/useUserStatusActions";

import { useUsersData } from "./hooks/data/useUsersData";

export default function UsersPage() {
  const confirmDialog = useConfirm();

  const infoDialog = useInfoModal();

  const [showInactive, setShowInactive] = useState(false);

  const { users, setUsers, currentUser, selectedMasterCinemaId, loading } =
    useUsersData({
      showError: (title, description) => {
        infoDialog.showError(title, description);
      },
    });

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" &&
    !currentUser.cinemaId &&
    !selectedMasterCinemaId;

  const {
    showCreate,
    closeCreateUserModal,
    editingUser,
    setEditingUser,
    newUser,
    setNewUser,
    createUser,
    updateUser,
    openCreateUserModal,
    openEditUserModal,
  } = useUserFormActions({
    currentUser,
    selectedMasterCinemaId,
    needsMasterCinemaSelection,
    setUsers,
    showError: (title, description) => {
      infoDialog.showError(title, description);
    },
  });

  const { deactivateUser, reactivateUser } = useUserStatusActions({
    setUsers,
    confirm: confirmDialog.confirm,
    showError: (title, description) => {
      infoDialog.showError(title, description);
    },
  });

  const visibleUsers = showInactive
    ? users
    : users.filter((user) => user.isActive !== false);

  if (loading) {
    return (
      <PermissionGuard permission="canManageUsers">
        <div className="min-h-screen bg-gray-100 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          Indlæser brugere...
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="canManageUsers">
      <div className="min-h-screen bg-gray-100 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <UsersHeader
          showInactive={showInactive}
          setShowInactive={setShowInactive}
          needsMasterCinemaSelection={needsMasterCinemaSelection}
          onCreateClick={openCreateUserModal}
        />
        {needsMasterCinemaSelection && <UsersMasterCinemaRequired />}

        {showCreate && (
          <UserModal
            title="Opret bruger"
            user={newUser}
            setUser={setNewUser}
            onClose={closeCreateUserModal}
            onSave={createUser}
            showPassword
          />
        )}

        {editingUser && (
          <EditUserModal
            user={editingUser}
            setUser={setEditingUser}
            onClose={() => {
              setEditingUser(null);
            }}
            onSave={updateUser}
          />
        )}

        <UsersTable
          visibleUsers={visibleUsers}
          needsMasterCinemaSelection={needsMasterCinemaSelection}
          onEdit={openEditUserModal}
          onDeactivate={deactivateUser}
          onReactivate={reactivateUser}
        />

        <ConfirmModal
          open={confirmDialog.open}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          confirmVariant={confirmDialog.confirmVariant}
          loading={confirmDialog.loading}
          onConfirm={confirmDialog.handleConfirm}
          onCancel={confirmDialog.handleCancel}
        />

        <InfoModal
          open={infoDialog.open}
          title={infoDialog.title}
          description={infoDialog.description}
          buttonText={infoDialog.buttonText}
          variant={infoDialog.variant}
          onClose={infoDialog.close}
        />
      </div>
    </PermissionGuard>
  );
}
