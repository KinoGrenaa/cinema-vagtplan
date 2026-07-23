"use client";

import { useState } from "react";

import PermissionGuard from "@/app/components/access/PermissionGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";

import MasterUserFormModal from "./components/form/MasterUserFormModal";
import UserCinemaMembershipModal from "./components/form/UserCinemaMembershipModal";
import {
  EditUserModal,
  UserModal,
} from "./components/form/UserFormModal";
import UsersHeader from "./components/layout/UsersHeader";
import UsersMasterCinemaRequired from "./components/layout/UsersMasterCinemaRequired";
import MasterUsersSection from "./components/list/MasterUsersSection";
import UsersTable from "./components/list/UsersTable";
import { useMasterUserActions } from "./hooks/actions/useMasterUserActions";
import { useUserCinemaMembershipActions } from "./hooks/actions/useUserCinemaMembershipActions";
import { useUserFormActions } from "./hooks/actions/useUserFormActions";
import { useUserStatusActions } from "./hooks/actions/useUserStatusActions";
import { useUsersData } from "./hooks/data/useUsersData";
import styles from "./UsersPageContent.module.css";

export default function UsersPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const [showInactive, setShowInactive] = useState(false);

  const {
    users,
    setUsers,
    masterUsers,
    setMasterUsers,
    currentUser,
    selectedMasterCinemaId,
    loading,
    loadingMasterUsers,
  } = useUsersData({
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

  const cinemaMembershipActions = useUserCinemaMembershipActions({
    showError: (title, description) => {
      infoDialog.showError(title, description);
    },
  });

  const masterUserActions = useMasterUserActions({
    setMasterUsers,
    confirm: confirmDialog.confirm,
    showError: (title, description) => {
      infoDialog.showError(title, description);
    },
  });

  const visibleUsers = showInactive
    ? users
    : users.filter((user) => user.isActive !== false);
  const currentUserId = currentUser?.id ?? currentUser?.sub ?? null;

  if (loading) {
    return (
      <PermissionGuard permission="canManageUsers">
        <main className={styles.page}>
          <div className={styles.content}>
            <div className={styles.loadingCard} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              <span>Indlæser brugere...</span>
            </div>
          </div>
        </main>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="canManageUsers">
      <main className={styles.page}>
        <div className={styles.content}>
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

          {masterUserActions.mode && (
            <MasterUserFormModal
              mode={masterUserActions.mode}
              form={masterUserActions.form}
              saving={masterUserActions.saving}
              onChange={masterUserActions.setForm}
              onClose={masterUserActions.closeModal}
              onSave={masterUserActions.save}
            />
          )}

          <UserCinemaMembershipModal
            user={cinemaMembershipActions.selectedUser}
            cinemas={cinemaMembershipActions.cinemas}
            selectedCinemaIds={cinemaMembershipActions.selectedCinemaIds}
            primaryCinemaId={cinemaMembershipActions.primaryCinemaId}
            defaultCinemaId={cinemaMembershipActions.defaultCinemaId}
            loading={cinemaMembershipActions.loading}
            saving={cinemaMembershipActions.saving}
            error={cinemaMembershipActions.error}
            onToggleCinema={cinemaMembershipActions.toggleCinema}
            onClose={cinemaMembershipActions.closeMembershipModal}
            onSave={cinemaMembershipActions.saveMemberships}
          />

          <UsersTable
            visibleUsers={visibleUsers}
            needsMasterCinemaSelection={needsMasterCinemaSelection}
            canManageCinemaMemberships={currentUser?.role === "MASTER"}
            onEdit={openEditUserModal}
            onManageCinemaMemberships={
              cinemaMembershipActions.openMembershipModal
            }
            onDeactivate={deactivateUser}
            onReactivate={reactivateUser}
          />

          {currentUser?.role === "MASTER" && (
            <MasterUsersSection
              users={masterUsers}
              loading={loadingMasterUsers}
              currentUserId={currentUserId}
              showInactive={showInactive}
              onCreate={masterUserActions.openCreate}
              onEdit={masterUserActions.openEdit}
              onDeactivate={masterUserActions.deactivate}
              onReactivate={masterUserActions.reactivate}
            />
          )}

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
      </main>
    </PermissionGuard>
  );
}
