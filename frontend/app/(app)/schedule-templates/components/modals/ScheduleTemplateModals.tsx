import type { ComponentProps } from "react";

import InfoModal from "@/app/components/modals/InfoModal";
import ScheduleTemplateCopyDayModal from "../copy/ScheduleTemplateCopyDayModal";
import ScheduleTemplateCopyModal from "../copy/ScheduleTemplateCopyModal";
import ScheduleTemplateCreateModal from "./ScheduleTemplateCreateModal";

type ScheduleTemplateModalsProps = {
  createTemplateModalOpen: boolean;
  createTemplateModalProps: ComponentProps<typeof ScheduleTemplateCreateModal>;
  copyTemplateModalOpen: boolean;
  copyTemplateModalProps: ComponentProps<typeof ScheduleTemplateCopyModal> | null;
  copyDayModalOpen: boolean;
  copyDayModalProps: ComponentProps<typeof ScheduleTemplateCopyDayModal>;
  infoModalProps: ComponentProps<typeof InfoModal>;
};

export default function ScheduleTemplateModals({
  createTemplateModalOpen,
  createTemplateModalProps,
  copyTemplateModalOpen,
  copyTemplateModalProps,
  copyDayModalOpen,
  copyDayModalProps,
  infoModalProps,
}: ScheduleTemplateModalsProps) {
  return (
    <>
      {createTemplateModalOpen && (
        <ScheduleTemplateCreateModal {...createTemplateModalProps} />
      )}

      {copyTemplateModalOpen && copyTemplateModalProps && (
        <ScheduleTemplateCopyModal {...copyTemplateModalProps} />
      )}

      {copyDayModalOpen && (
        <ScheduleTemplateCopyDayModal {...copyDayModalProps} />
      )}

      <InfoModal {...infoModalProps} />
    </>
  );
}
