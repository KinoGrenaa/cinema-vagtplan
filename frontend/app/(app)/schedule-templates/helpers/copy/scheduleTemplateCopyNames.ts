type ScheduleTemplateNameSource = {
  id: number;
  name: string;
};

function normalizeTemplateName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("da-DK");
}

function buildCopiedTemplateName(sourceName: string, copyNumber: number | null) {
  const baseName = `Kopi af ${sourceName.trim() || "vagtsskabelon"}`;

  if (!copyNumber) return baseName;

  return `${baseName} (${copyNumber})`;
}

export function scheduleTemplateNameExists({
  templates,
  name,
  ignoredTemplateId,
}: {
  templates: ScheduleTemplateNameSource[];
  name: string;
  ignoredTemplateId?: number | null;
}) {
  const normalizedName = normalizeTemplateName(name);

  if (!normalizedName) return false;

  return templates.some(
    (template) =>
      template.id !== ignoredTemplateId &&
      normalizeTemplateName(template.name) === normalizedName,
  );
}

export function getUniqueCopiedScheduleTemplateName({
  sourceName,
  templates,
  ignoredTemplateId,
}: {
  sourceName: string;
  templates: ScheduleTemplateNameSource[];
  ignoredTemplateId?: number | null;
}) {
  const baseName = buildCopiedTemplateName(sourceName, null);

  if (!scheduleTemplateNameExists({ templates, name: baseName, ignoredTemplateId })) {
    return baseName;
  }

  for (let copyNumber = 2; copyNumber <= 99; copyNumber += 1) {
    const candidateName = buildCopiedTemplateName(sourceName, copyNumber);

    if (
      !scheduleTemplateNameExists({
        templates,
        name: candidateName,
        ignoredTemplateId,
      })
    ) {
      return candidateName;
    }
  }

  return `${baseName} ${new Date().toLocaleDateString("da-DK")}`;
}
