import ExcelJS from "exceljs";
import { createWriteStream } from "fs";
import { join } from "path";
import { ExportData, FileType } from "./export.types";

export class FileGenerationService {
  private readonly uploadsDir = join(process.cwd(), "uploads", "exports");

  constructor() {
    // Ensure uploads directory exists
    this.ensureUploadsDir();
  }

  private ensureUploadsDir() {
    const fs = require("fs");
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Generate Excel file from export data
   */
  async generateExcelFile(data: ExportData, filename: string): Promise<string> {
    const workbook = new ExcelJS.Workbook();

    // Add each sheet
    for (const [sheetName, sheetData] of Object.entries(data)) {
      const worksheet = workbook.addWorksheet(sheetName);

      if (sheetData.length === 0) {
        worksheet.addRow(["No data available"]);
        continue;
      }

      // Add headers
      const headers = Object.keys(sheetData[0]);
      worksheet.addRow(headers);

      // Style headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add data rows
      sheetData.forEach((row) => {
        const values = headers.map((header) => row[header] || "");
        worksheet.addRow(values);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });
    }

    // Save file
    const filePath = join(this.uploadsDir, `${filename}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }

  /**
   * Generate CSV file from export data
   */
  async generateCsvFile(data: ExportData, filename: string): Promise<string> {
    const fs = require("fs");
    const filePath = join(this.uploadsDir, `${filename}.csv`);

    let csvContent = "";

    // For CSV, we'll combine all sheets into one file with sheet names as prefixes
    for (const [sheetName, sheetData] of Object.entries(data)) {
      if (sheetData.length === 0) {
        csvContent += `\n${sheetName}\nNo data available\n\n`;
        continue;
      }

      csvContent += `\n${sheetName}\n`;

      // Add headers
      const headers = Object.keys(sheetData[0]);
      csvContent += headers.map((h) => `"${h}"`).join(",") + "\n";

      // Add data rows
      sheetData.forEach((row) => {
        const values = headers.map((header) => {
          const value = row[header] || "";
          return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csvContent += values.join(",") + "\n";
      });

      csvContent += "\n";
    }

    fs.writeFileSync(filePath, csvContent, "utf8");
    return filePath;
  }

  /**
   * Generate file and return download URL
   */
  async generateDownloadUrl(
    data: ExportData,
    filename: string,
    fileType: FileType,
  ): Promise<string> {
    let filePath: string;

    if (fileType === "xlsx") {
      filePath = await this.generateExcelFile(data, filename);
    } else {
      filePath = await this.generateCsvFile(data, filename);
    }

    // Return relative URL for download
    const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
    return `${baseUrl}/api/export/download/${filename}.${fileType}`;
  }

  /**
   * Get file path for download
   */
  getFilePath(filename: string, fileType: FileType): string {
    return join(this.uploadsDir, `${filename}.${fileType}`);
  }

  /**
   * Clean up old files (optional - for maintenance)
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    const fs = require("fs");

    try {
      const files = fs.readdirSync(this.uploadsDir);
      const now = Date.now();

      files.forEach((file) => {
        const filePath = join(this.uploadsDir, file);
        const stats = fs.statSync(filePath);
        const ageHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);

        if (ageHours > maxAgeHours) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old export file: ${file}`);
        }
      });
    } catch (error) {
      console.error("Error cleaning up old files:", error);
    }
  }
}

