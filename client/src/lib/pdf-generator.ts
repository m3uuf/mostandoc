import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function generatePdfFromElement(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}

/**
 * Generate a professional PDF from text editor content with header/footer.
 */
export async function generateDocumentPdf(opts: {
  content: string;
  title: string;
  companyName?: string;
  companyInfo?: string;
}): Promise<void> {
  const { content, title, companyName, companyInfo } = opts;

  // Create temporary render element
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;top:-9999px;left:0;width:794px;padding:60px 50px 80px;background:#fff;font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;direction:rtl;line-height:1.8;color:#1a1a1a;font-size:14px;";

  // Header
  if (companyName) {
    container.innerHTML += `
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:20px;font-weight:700;color:#1a1a1a;">${companyName}</div>
        ${companyInfo ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">${companyInfo}</div>` : ""}
      </div>
      <hr style="border:none;border-top:2px solid #e5e7eb;margin:12px 0 20px;" />
    `;
  }

  // Title
  container.innerHTML += `<h1 style="font-size:22px;font-weight:700;margin:0 0 24px;text-align:center;color:#111;">${title}</h1>`;

  // Content wrapper with prose styling
  const contentDiv = document.createElement("div");
  contentDiv.className = "prose-document-pdf";
  contentDiv.innerHTML = content;
  contentDiv.style.cssText = "font-size:14px;line-height:1.8;";

  // Style tables inside content
  contentDiv.querySelectorAll("table").forEach((table) => {
    table.style.cssText = "width:100%;border-collapse:collapse;margin:16px 0;";
    table.querySelectorAll("th,td").forEach((cell) => {
      (cell as HTMLElement).style.cssText =
        "border:1px solid #d1d5db;padding:8px 12px;text-align:right;font-size:13px;";
    });
    table.querySelectorAll("th").forEach((th) => {
      (th as HTMLElement).style.cssText +=
        "background:#f3f4f6;font-weight:600;";
    });
  });

  container.appendChild(contentDiv);

  // Footer
  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  container.innerHTML += `
    <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;">
      <span>${title}</span>
      <span>${dateStr}</span>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const sanitized = title.replace(/[^\u0600-\u06FFa-zA-Z0-9\s_-]/g, "").trim() || "مستند";
    await generatePdfFromElement(container, `${sanitized}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
