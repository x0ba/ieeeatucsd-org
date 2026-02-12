import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Constitution, ConstitutionSection } from "./types";
import { getSectionDisplayTitle } from "./utils/constitutionUtils";
import { Button } from "@/components/ui/button";

interface ConstitutionPreviewProps {
  constitution: Constitution | null;
  sections: ConstitutionSection[];
  onPrint: () => void;
}

const ConstitutionPreview: React.FC<ConstitutionPreviewProps> = ({
  constitution,
  sections,
  onPrint,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showTableOfContents] = useState(true);

  const totalPages = useMemo(() => {
    const calculateTotalPages = (sections: ConstitutionSection[], showTOC: boolean) => {
    let pageCount = 1; // Cover page

    if (showTOC) {
      const tableOfContents = generateTableOfContentsSections(sections);
      const tocPagesNeeded = Math.ceil(tableOfContents.length / 30);
      pageCount += tocPagesNeeded;
    }

      pageCount += sections.length;
      return pageCount;
    };
    return calculateTotalPages(sections, showTableOfContents);
  }, [sections, showTableOfContents]);

  const generateTableOfContentsSections = (sections: ConstitutionSection[]) => {
    return sections.filter(s => s.type !== "subsection").map((section, index) => ({
      section,
      pageNum: index + 1,
    }));
  };

  const renderCurrentPage = () => {
    if (currentPage === 1) {
      return renderCoverPage();
    } else if (showTableOfContents) {
      const tableOfContents = generateTableOfContentsSections(sections);
      const tocPagesNeeded = Math.ceil(tableOfContents.length / 30);

      if (currentPage >= 2 && currentPage <= 1 + tocPagesNeeded) {
        const tocPageIndex = currentPage - 2;
        const pageEntries = tableOfContents.slice(tocPageIndex * 30, (tocPageIndex + 1) * 30);
        return renderTableOfContentsPage(pageEntries, tocPageIndex === 0);
      } else {
        const contentPageIndex = currentPage - 2 - tocPagesNeeded;
        return renderContentPage(contentPageIndex);
      }
    } else {
      const contentPageIndex = currentPage - 2;
      return renderContentPage(contentPageIndex);
    }
  };

  const renderCoverPage = () => (
    <div className="h-[11in] flex flex-col justify-center items-center p-8">
      <div className="mb-12">
        <img
          src="/blue_logo_only.png"
          alt="IEEE Logo"
          className="w-[120px] h-[120px] object-contain mx-auto"
        />
      </div>

      <h1 className="text-[28pt] text-center font-bold text-black mb-6">
        IEEE at UC San Diego
      </h1>

      <h2 className="text-[16pt] text-center font-semibold text-black mb-6">
        The Institute of Electrical and Electronics Engineers at UC San Diego Constitution
      </h2>

      <div className="text-center mt-8">
        <p className="text-[14pt] text-black mb-3">
          Last Updated:{" "}
          {constitution?.title
            ? new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "N/A"}
        </p>
        <p className="text-[11pt] text-gray-500 mt-2">
          Adopted since September 2006
        </p>
      </div>
    </div>
  );

  const renderTableOfContentsPage = (entries: Array<{ section: ConstitutionSection; pageNum: number }>, isFirstPage: boolean) => (
    <div className="h-[11in] p-12">
      {isFirstPage && (
        <h2 className="text-[18pt] font-bold text-gray-900 mb-8 text-center">
          Table of Contents
        </h2>
      )}

      {!isFirstPage && (
        <h2 className="text-[18pt] font-bold text-gray-900 mb-8 text-center">
          Table of Contents (continued)
        </h2>
      )}

      <div className="space-y-2 text-[12pt]">
        {entries.map(({ section, pageNum }) => (
          <div key={section.id} className="flex justify-between items-start">
            <div className={`flex-1 ${section.type === "section" ? "ml-6" : ""}`}>
              <span className="text-gray-900">
                {getSectionDisplayTitle(section, sections)}
              </span>
            </div>
            <div className="flex-shrink-0 ml-4 text-gray-700">{pageNum}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContentPage = (pageIndex: number) => {
    const section = sections[pageIndex];
    if (!section) {
      return (
        <div className="h-[11in] flex items-center justify-center">
          <div className="text-gray-500 text-[12pt]">Page not found</div>
        </div>
      );
    }

    return (
      <div className="h-[11in] p-12">
        {section.type === "article" && (
          <h2 className="text-[18pt] font-bold text-center mb-8">
            {getSectionDisplayTitle(section, sections)}
          </h2>
        )}

        {section.type === "section" && (
          <h3 className="text-[12pt] font-bold text-center mb-6">
            {getSectionDisplayTitle(section, sections)}
          </h3>
        )}

        {section.type === "preamble" && (
          <h2 className="text-[18pt] font-bold text-center mb-8">
            Preamble
          </h2>
        )}

        {section.type === "amendment" && (
          <h3 className="text-[12pt] font-bold text-center mb-6">
            {getSectionDisplayTitle(section, sections)}
          </h3>
        )}

        {section.content && (
          <div className="text-[11pt] leading-relaxed text-gray-800 whitespace-pre-wrap text-justify">
            {section.content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white shadow-lg" style={{ fontFamily: "Arial, sans-serif", fontSize: "11pt", lineHeight: "1.5", width: "8.5in", margin: "0 auto" }}>
      {/* Page Navigation Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <Button onClick={onPrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>

      {/* Page Content */}
      <div className="bg-white">
        {renderCurrentPage()}
      </div>

      {/* Page Navigation Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            ‹
          </Button>

          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            ›
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConstitutionPreview;
