import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import {
  getTemplates,
  saveTemplate,
  deleteTemplate,
  useTemplate,
  Template,
  TemplateType,
  FormFieldValue,
  TemplateFile,
} from "@/lib/template-store";
import {
  Layout,
  Plus,
  Trash2,
  Edit3,
  FileText,
  FileBox,
  Briefcase,
  ChevronRight,
  Eye,
  CheckCircle2,
  X,
  PlusCircle,
  Paperclip,
  Calendar,
  Zap,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates Library — Smart Apply" }] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  // Form State for creating/editing a template
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<TemplateType>("form");
  const [fields, setFields] = useState<FormFieldValue[]>([]);
  const [files, setFiles] = useState<TemplateFile[]>([]);

  // Temp input for adding a new field or document
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (activeTab === "all") {
      setFilteredTemplates(templates);
    } else {
      setFilteredTemplates(templates.filter((t) => t.type === activeTab));
    }
  }, [activeTab, templates]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const list = await getTemplates();
      setTemplates(list);
    } catch (err) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTemplateId(null);
    setName("");
    setType("form");
    setFields([]);
    setFiles([]);
    setNewKey("");
    setNewLabel("");
    setNewValue("");
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (template: Template) => {
    setTemplateId(template.id);
    setName(template.name);
    setType(template.type);
    setFields(template.fields || []);
    setFiles(template.files || []);
    setIsModalOpen(true);
  };

  const handleAddField = () => {
    if (!newKey.trim() || !newLabel.trim()) {
      toast.error("Key and Label are required");
      return;
    }
    setFields([...fields, { key: newKey.trim(), label: newLabel.trim(), value: newValue.trim() }]);
    setNewKey("");
    setNewLabel("");
    setNewValue("");
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const base64 = evt.target.result.toString();
          setFiles((prev) => [
            ...prev,
            { name: file.name, type: file.type, size: file.size, base64 },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    const t: Template = {
      id: templateId || crypto.randomUUID(),
      name: name.trim(),
      type,
      lastUsed: new Date().toISOString(),
      fields: type === "form" || type === "upload-kit" ? fields : undefined,
      files: type === "document" || type === "upload-kit" ? files : undefined,
    };

    const updated = await saveTemplate(t);
    setTemplates(updated);
    setIsModalOpen(false);
    resetForm();
    toast.success(templateId ? "Template updated successfully" : "Template created successfully");
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      const updated = await deleteTemplate(id);
      setTemplates(updated);
      toast.success("Template deleted successfully");
    }
  };

  const handleUseTemplate = async (template: Template) => {
    const updated = await useTemplate(template.id);
    setTemplates(updated);
    toast.success(`Template "${template.name}" auto-filled!`, {
      description: "Ready to complete forms instantly using saved presets.",
      icon: <Zap className="h-4 w-4 text-amber-500 animate-pulse" />,
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 1;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-12 select-none animate-fade-in">
        {/* UNIQUE HERO SECTION: Teal-focused Emerald Glassmorphism Theme */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#0F172A] via-[#0D9488] to-[#14B8A6] p-8 lg:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 min-h-[200px]">
          <div className="relative z-10 flex-1 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wider text-teal-200 border border-white/10 shadow-sm select-none">
              <Zap className="h-3.5 w-3.5 text-teal-300 animate-pulse" /> Highly-tuned workflow
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight leading-[1.1]">
              Custom Library
            </h1>
            <p className="mt-2.5 text-white/80 font-medium text-xs md:text-sm max-w-md leading-relaxed">
              Store predefined files and data to skip repetitive uploads and form filling. Fast, local, and categorized.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="relative z-10 flex items-center gap-2 bg-[#111827] text-white border border-[#1E293B] hover:bg-[#1E293B] font-bold text-sm px-6 py-3.5 rounded-2xl shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap group select-none"
          >
            <Plus className="h-4 w-4 text-teal-400 group-hover:rotate-90 transition-all duration-300" />
            Create Template
          </button>
        </div>

        {/* DISTINCT FILTER TABS SECTION */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 self-start shadow-sm select-none">
          {[
            { id: "all", label: "All Templates" },
            { id: "form", label: "Form Fields" },
            { id: "document", label: "Documents Only" },
            { id: "upload-kit", label: "Upload Kits" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-all ${
                  active
                    ? "bg-white text-[#0D9488] shadow-sm font-black"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TEMPLATES GRID */}
        {loading ? (
          <div className="py-20 text-center font-black uppercase tracking-widest text-teal-600 opacity-50 animate-pulse">
            Loading library collections...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="border-2 border-dashed border-teal-200 bg-teal-50/20 rounded-3xl p-12 text-center max-w-2xl mx-auto flex flex-col items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-white border border-teal-100 flex items-center justify-center text-teal-600 shadow-md">
              <FileBox className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">No matching templates found</h3>
              <p className="text-xs font-medium text-slate-500 mt-1 max-w-xs">
                Try switching the filters or build a new predefined kit right away!
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer select-none"
            >
              <PlusCircle className="h-4 w-4" /> Add Preset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const Icon =
                template.type === "form"
                  ? FileText
                  : template.type === "document"
                  ? FileBox
                  : Briefcase;

              const typeLabel =
                template.type === "form"
                  ? "Form Template"
                  : template.type === "document"
                  ? "Document Template"
                  : "Upload Kit";

              return (
                <div
                  key={template.id}
                  className="bg-white border border-slate-100 hover:border-teal-200/60 p-6 rounded-3xl hover:shadow-[0_20px_50px_-20px_rgba(13,148,136,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] relative overflow-hidden group select-none"
                >
                  <div className="absolute top-0 right-0 p-4 flex gap-1 items-center z-10">
                    <button
                      onClick={() => handleOpenEditModal(template)}
                      title="Edit Template"
                      className="h-8 w-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      title="Delete Template"
                      className="h-8 w-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0 border border-teal-100/40 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#0D9488] bg-teal-50 px-2 py-0.5 rounded border border-teal-100 select-none">
                          {typeLabel}
                        </span>
                        <h3 className="text-base font-black text-slate-800 group-hover:text-[#0D9488] transition duration-200 mt-1">
                          {template.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-slate-50 pt-3 mt-1 text-xs font-medium text-slate-500">
                      {template.fields && template.fields.length > 0 && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-teal-600" />
                          <span>{template.fields.length} predefined fields</span>
                        </div>
                      )}
                      {template.files && template.files.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Paperclip className="h-3 w-3 text-teal-600" />
                          <span>{template.files.length} attached files</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>Last used: {new Date(template.lastUsed).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-4">
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="inline-flex items-center gap-1.5 bg-[#0D9488]/10 hover:bg-[#0D9488] text-[#0D9488] hover:text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5" /> Use Now
                    </button>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 duration-200" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CREATE / EDIT MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm select-none animate-fade-in">
            <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl p-6 lg:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col gap-6 animate-scale-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {templateId ? "Edit Configuration" : "New Library Item"}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Enter the specific data fields or files you want to save.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 w-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="flex flex-col gap-6">
                {/* Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">
                    Collection Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Application form details, personal IDs"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
                    required
                  />
                </div>

                {/* Type Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">
                    Information Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "form", label: "Form Fields", icon: FileText, desc: "Saves form text" },
                      { id: "document", label: "Documents", icon: FileBox, desc: "PDF & Images" },
                      { id: "upload-kit", label: "Combined Kit", icon: Briefcase, desc: "Fields & Files" },
                    ].map((t) => {
                      const Icon = t.icon;
                      const selected = type === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setType(t.id as TemplateType)}
                          className={`border-2 rounded-2xl p-3 flex flex-col gap-2 cursor-pointer transition-all ${
                            selected
                              ? "bg-teal-50/50 border-[#0D9488]"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${selected ? "bg-[#0D9488] text-white" : "bg-slate-100 text-slate-500"}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className={`text-xs font-bold ${selected ? "text-[#0D9488]" : "text-slate-800"}`}>{t.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">{t.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* FORM FIELDS (FOR FORMS OR KITS) */}
                {(type === "form" || type === "upload-kit") && (
                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">
                        Saved Form Inputs
                      </label>
                      <span className="text-[10px] font-bold text-teal-600">{fields.length} predefined</span>
                    </div>

                    {/* Field input builder */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                      <input
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="Key (e.g., fatherName)"
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-100 focus:bg-white bg-white focus:outline-none"
                      />
                      <input
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Label (e.g., Father's Name)"
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-100 focus:bg-white bg-white focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          placeholder="Value (e.g., Mark)"
                          className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-slate-100 focus:bg-white bg-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddField}
                          className="bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs p-2 rounded-xl transition cursor-pointer select-none"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Active list of fields */}
                    {fields.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1 border border-slate-100 p-2.5 rounded-2xl bg-white max-h-[140px] overflow-y-auto">
                        {fields.map((f, idx) => (
                          <div
                            key={f.key + idx}
                            className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-xl text-xs transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#0D9488]">{f.label}:</span>
                              <span className="font-bold text-slate-800">{f.value || <em className="opacity-40 font-normal">None</em>}</span>
                              <span className="text-[10px] bg-teal-50 text-[#0D9488] px-1.5 py-0.5 rounded">
                                {f.key}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveField(idx)}
                              className="h-6 w-6 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* DOCUMENTS / FILES (FOR DOCUMENTS OR KITS) */}
                {(type === "document" || type === "upload-kit") && (
                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">
                        Predefined Document Uploads
                      </label>
                      <span className="text-[10px] font-bold text-teal-600">{files.length} attached</span>
                    </div>

                    {/* Input file trigger */}
                    <div className="border-2 border-dashed border-teal-200 bg-teal-50/20 hover:bg-teal-50/50 p-4 rounded-2xl flex items-center justify-between gap-4 transition-all relative">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        multiple
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white border border-teal-100 flex items-center justify-center text-teal-600">
                          <Paperclip className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">Drop files or select here</span>
                          <span className="text-[9px] font-medium text-slate-500">Supports PDF, PNG, JPG, WebP</span>
                        </div>
                      </div>
                      <span className="bg-[#0D9488] text-white text-[10px] font-bold px-3 py-1.5 rounded-xl">
                        Select files
                      </span>
                    </div>

                    {/* Attached list of files */}
                    {files.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1 border border-slate-100 p-2.5 rounded-2xl bg-white max-h-[140px] overflow-y-auto">
                        {files.map((f, idx) => (
                          <div
                            key={f.name + idx}
                            className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-xl text-xs transition"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-[#0D9488]" />
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-800 max-w-[280px] truncate">{f.name}</span>
                                <span className="text-[9px] font-medium text-slate-400">{formatBytes(f.size)}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="h-6 w-6 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* MODAL FOOTER */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#0D9488] to-[#14B8A6] hover:brightness-110 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    {templateId ? "Update Item" : "Save Collection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
