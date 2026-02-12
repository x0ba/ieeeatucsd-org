/**
 * PDF Export Utilities for Constitution Builder
 * Uses browser's native print functionality with print-specific CSS
 */

/**
 * Opens the browser print dialog for PDF export
 * The browser's print dialog allows users to save as PDF
 */
export const exportToPdf = (): void => {
  window.print();
};

/**
 * Generates a filename for the exported PDF
 */
export const generatePdfFilename = (
  organizationName: string,
  version: number,
): string => {
  const sanitizedOrgName = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${sanitizedOrgName}-constitution-v${version}.pdf`;
};

/**
 * Prints the current page with specific print settings
 */
export const printConstitution = (): void => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert(
      "Unable to open print window. Please check your browser's popup settings.",
    );
    return;
  }

  const content = document.querySelector(".constitution-preview")?.innerHTML;
  if (!content) {
    alert("No constitution content to print.");
    printWindow.close();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Constitution Preview</title>
        <style>
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            font-family: Georgia, serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #1a1a1a;
          }
          .cover-page {
            text-align: center;
            padding: 3in 1in;
            border-bottom: 2px solid #333;
          }
          .cover-page h1 {
            font-size: 24pt;
            margin-bottom: 0.5in;
          }
          .cover-page h2 {
            font-size: 18pt;
            font-weight: normal;
            margin-bottom: 1in;
            color: #555;
          }
          .cover-page .org-name {
            font-size: 16pt;
            margin-top: 2in;
          }
          .toc-page {
            page-break-before: always;
            padding: 1in;
          }
          .toc-page h2 {
            text-align: center;
            border-bottom: 1px solid #333;
            padding-bottom: 0.25in;
            margin-bottom: 0.5in;
          }
          .toc-item {
            display: flex;
            justify-content: space-between;
            margin: 0.125in 0;
          }
          .toc-item .dots {
            border-bottom: 1px dotted #999;
            flex: 1;
            margin: 0 0.25in;
          }
          .page-number {
            text-align: center;
            font-size: 9pt;
            color: #666;
            margin-top: 0.25in;
          }
          .article {
            margin: 0.25in 0 0.5in;
          }
          .article-title {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 0.25in;
          }
          .section {
            margin: 0.125in 0 0.25in;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 0.125in;
          }
          .preamble {
            font-style: italic;
            text-align: justify;
            margin: 0.5in 0;
            padding: 0 0.5in;
            line-height: 1.8;
          }
          .amendment {
            border-left: 3px solid #cc0000;
            padding-left: 0.25in;
            margin: 0.25in 0;
            font-size: 10pt;
          }
          .amendment-header {
            font-weight: bold;
            color: #cc0000;
          }
          @media print {
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  // Wait for content to load before printing
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

/**
 * Checks if the current browser supports PDF export via print
 */
export const supportsPdfExport = (): boolean => {
  return typeof window.print === "function";
};

/**
 * Returns print-specific CSS to be added to preview pages
 */
export const getPrintStyles = (): string => {
  return `
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page-break {
        page-break-before: always;
      }
      .page-break-after {
        page-break-after: always;
      }
      .avoid-break {
        page-break-inside: avoid;
      }
    }
  `;
};
