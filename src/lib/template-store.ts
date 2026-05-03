import { get, set } from "idb-keyval";

export type TemplateType = "form" | "document" | "upload-kit";

export interface FormFieldValue {
  key: string;
  label: string;
  value: string;
}

export interface TemplateFile {
  name: string;
  type: string;
  size: number;
  base64: string; // Storing as base64 string for maximum compatibility
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  lastUsed: string; // ISO date string
  fields?: FormFieldValue[];
  files?: TemplateFile[];
}

const TEMPLATES_KEY = "smart_apply_templates_v1";

export async function getTemplates(): Promise<Template[]> {
  try {
    const list = await get<Template[]>(TEMPLATES_KEY);
    return list || [];
  } catch (error) {
    console.error("Failed to load templates from IndexedDB", error);
    return [];
  }
}

export async function saveTemplate(template: Template): Promise<Template[]> {
  try {
    const list = await getTemplates();
    const index = list.findIndex((t) => t.id === template.id);
    let updatedList: Template[];

    if (index !== -1) {
      updatedList = [
        ...list.slice(0, index),
        template,
        ...list.slice(index + 1),
      ];
    } else {
      updatedList = [...list, template];
    }

    await set(TEMPLATES_KEY, updatedList);
    return updatedList;
  } catch (error) {
    console.error("Failed to save template to IndexedDB", error);
    return [];
  }
}

export async function deleteTemplate(templateId: string): Promise<Template[]> {
  try {
    const list = await getTemplates();
    const updatedList = list.filter((t) => t.id !== templateId);
    await set(TEMPLATES_KEY, updatedList);
    return updatedList;
  } catch (error) {
    console.error("Failed to delete template from IndexedDB", error);
    return [];
  }
}

export async function useTemplate(templateId: string): Promise<Template[]> {
  try {
    const list = await getTemplates();
    const index = list.findIndex((t) => t.id === templateId);

    if (index !== -1) {
      const updatedTemplate: Template = {
        ...list[index],
        lastUsed: new Date().toISOString(),
      };
      const updatedList = [
        ...list.slice(0, index),
        updatedTemplate,
        ...list.slice(index + 1),
      ];
      await set(TEMPLATES_KEY, updatedList);
      return updatedList;
    }
    return list;
  } catch (error) {
    console.error("Failed to update last used on template", error);
    return [];
  }
}
