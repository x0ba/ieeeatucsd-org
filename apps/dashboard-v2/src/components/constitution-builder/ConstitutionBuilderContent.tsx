import { useState, useEffect } from "react";
import { FileText, Check, Edit3, Eye, History, Layers, FileEdit } from "lucide-react";
import { SaveStatus, ViewMode, EditorMode } from "./types";
import { useConstitutionData } from "./hooks/useConstitutionData";
import ConstitutionSidebar from "./ConstitutionSidebar";
import ConstitutionEditor from "./ConstitutionEditor";
import ConstitutionDocumentEditor from "./ConstitutionDocumentEditor";
import ConstitutionPreview from "./ConstitutionPreview";
import { ConstitutionAuditLog } from "./ConstitutionAuditLog";
import ConstitutionSearch from "./ConstitutionSearch";
import { Button } from "@/components/ui/button";
import { exportConstitutionToPdf } from "./utils/pdfExport";

const ConstitutionBuilderContent = () => {
  const {
    constitution,
    sections,
    isLoading,
    addSection,
    updateSection,
    deleteSection,
    initializeConstitution,
    constitutionId,
  } = useConstitutionData();

  const [currentView, setCurrentView] = useState<ViewMode>("editor");
  const [editorMode, setEditorMode] = useState<EditorMode>("section");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedSectionId, setHighlightedSectionId] = useState<string>("");

  const saveStatus: SaveStatus = isLoading ? "idle" : "saved";

  useEffect(() => {
    initializeConstitution();
  }, [initializeConstitution]);

  const toggleSectionExpansion = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleDeleteSection = async (sectionId: string) => {
    await deleteSection(sectionId);

    if (selectedSection === sectionId) {
      setSelectedSection(null);
    }
    if (editingSection === sectionId) {
      setEditingSection(null);
    }
  };

  const handleSelectSection = (sectionId: string, pageNumber?: number) => {
    setSelectedSection(sectionId);

    if (pageNumber && currentView === "preview") {
      // If we're in preview mode and have a page number, navigate to that page
      setCurrentPage(pageNumber);
      // Highlight the selected section temporarily
      setHighlightedSectionId(sectionId);
      setTimeout(() => setHighlightedSectionId(""), 3000); // Clear after 3 seconds
    } else {
      // Otherwise, switch to editor view
      setCurrentView("editor");

      // Auto-expand parent sections in sidebar
      const section = sections.find((s) => s.id === sectionId);
      if (section) {
        const newExpandedSections = new Set(expandedSections);

        let currentParentId = section.parentId;
        while (currentParentId) {
          newExpandedSections.add(currentParentId);
          const parentSection = sections.find((s) => s.id === currentParentId);
          currentParentId = parentSection?.parentId;
        }

        setExpandedSections(newExpandedSections);
      }
    }
  };

  const handlePrint = () => {
    exportConstitutionToPdf(constitution || null, sections);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-80 bg-white border-r border-gray-200 p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 w-full bg-gray-200 rounded animate-pulse" />
                <div className="ml-4 space-y-1">
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
          </div>

          <div className="flex-1 p-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="space-y-4">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
                <div className="h-32 w-full bg-gray-200 rounded animate-pulse" />
                <div className="flex space-x-2">
                  <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6 lg:mb-8">
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex-1 mr-8">
              <h1 className="text-2xl xl:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="h-7 w-7 xl:h-8 xl:w-8 text-blue-600" />
                Constitution Builder
              </h1>
              <p className="text-gray-600 mt-2 mb-4">
                Collaboratively build and manage the organization's constitution
              </p>
              <div className="max-w-md">
                <ConstitutionSearch
                  sections={sections}
                  onSelectSection={(id) => handleSelectSection(id)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === "saved" && (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Changes saved</span>
                  </>
                )}
                {saveStatus === "idle" && (
                  <>
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Ready to edit</span>
                  </>
                )}
              </div>

              <div className="flex bg-gray-100 rounded-xl p-1">
                <Button
                  onClick={() => setCurrentView("editor")}
                  className={`px-3 py-2 rounded-md text-sm font-medium min-h-[44px] ${
                    currentView === "editor"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  variant="ghost"
                >
                  <Edit3 className="h-4 w-4 inline mr-2" />
                  Editor
                </Button>
                <Button
                  onClick={() => setCurrentView("preview")}
                  className={`px-3 py-2 rounded-md text-sm font-medium min-h-[44px] ${
                    currentView === "preview"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  variant="ghost"
                >
                  <Eye className="h-4 w-4 inline mr-2" />
                  Preview
                </Button>
                <Button
                  onClick={() => setCurrentView("audit")}
                  className={`px-3 py-2 rounded-md text-sm font-medium min-h-[44px] ${
                    currentView === "audit"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  variant="ghost"
                >
                  <History className="h-4 w-4 inline mr-2" />
                  Audit Log
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {currentView === "editor" ? (
          <>
            {/* Editor Mode Toggle */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setEditorMode("section")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    editorMode === "section"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Section Editor
                </button>
                <button
                  onClick={() => setEditorMode("document")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    editorMode === "document"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FileEdit className="h-3.5 w-3.5" />
                  Document Editor
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {editorMode === "section"
                  ? "Edit individual sections from the sidebar"
                  : "Edit the entire constitution as a rich text document"}
              </span>
            </div>

            {editorMode === "section" ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                <div className="lg:col-span-3">
                  <ConstitutionSidebar
                    sections={sections}
                    selectedSection={selectedSection}
                    expandedSections={expandedSections}
                    onSelectSection={setSelectedSection}
                    onToggleExpand={toggleSectionExpansion}
                    onAddSection={addSection}
                    updateSection={updateSection}
                  />
                </div>

                <div className="lg:col-span-9">
                  <ConstitutionEditor
                    sections={sections}
                    selectedSection={selectedSection}
                    editingSection={editingSection}
                    onSelectSection={setSelectedSection}
                    onEditSection={setEditingSection}
                    onUpdateSection={updateSection}
                    onDeleteSection={handleDeleteSection}
                    onAddSection={addSection}
                  />
                </div>
              </div>
            ) : (
              <ConstitutionDocumentEditor
                sections={sections}
                onUpdateSection={updateSection}
              />
            )}
          </>
        ) : (
          <div className="w-full">
            {currentView === "preview" ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-[calc(100vh-200px)] overflow-auto">
                <ConstitutionPreview
                  constitution={constitution || null}
                  sections={sections}
                  onPrint={handlePrint}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  highlightedSectionId={highlightedSectionId}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
                <ConstitutionAuditLog constitutionId={constitutionId || ""} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConstitutionBuilderContent;
