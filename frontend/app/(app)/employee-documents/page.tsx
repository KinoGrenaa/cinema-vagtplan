"use client";

import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import EmployeeDocumentsHeader from "./components/layout/EmployeeDocumentsHeader";
import EmployeeDocumentsListSection from "./components/list/EmployeeDocumentsListSection";
import EmployeeDocumentsMasterCinemaRequired from "./components/layout/EmployeeDocumentsMasterCinemaRequired";
import EmployeeDocumentUploadForm from "./components/form/EmployeeDocumentUploadForm";
import { useEmployeeDocumentActions } from "./hooks/actions/useEmployeeDocumentActions";
import { useEmployeeDocumentsData } from "./hooks/data/useEmployeeDocumentsData";

export default function EmployeeDocumentsPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const {
    users,
    documents,
    selectedUserId,
    setSelectedUserId,
    loading,
    activeCinemaId,
    needsMasterCinemaSelection,
    fetchDocuments,
  } = useEmployeeDocumentsData({ infoDialog });
  const {
    title,
    setTitle,
    file,
    setFile,
    uploading,
    handleUpload,
    handleDelete,
  } = useEmployeeDocumentActions({
    confirmDialog,
    infoDialog,
    needsMasterCinemaSelection,
    selectedUserId,
    activeCinemaId,
    fetchDocuments,
  });

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 md:p-8 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-5xl space-y-6">
          <EmployeeDocumentsHeader />
          {needsMasterCinemaSelection && <EmployeeDocumentsMasterCinemaRequired />}
          <EmployeeDocumentUploadForm
            users={users}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            title={title}
            setTitle={setTitle}
            file={file}
            setFile={setFile}
            uploading={uploading}
            needsMasterCinemaSelection={needsMasterCinemaSelection}
            onSubmit={handleUpload}
          />
          <EmployeeDocumentsListSection
            documents={documents}
            loading={loading}
            onDelete={handleDelete}
          />
        </div>
      </main>
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
    </AdminGuard>
  );
}
