/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import mammoth from 'mammoth';

// pdf-parse will be dynamically imported to avoid debug mode issues

import * as xlsx from 'xlsx';

// Constants for file size limits (in bytes)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100MB for PDFs

/**
 * Interface for VLM service
 */
export interface VLMService {
  describeImage(buffer: Buffer, mimeType: string): Promise<string>;
}

/**
 * A service to parse various file types into Markdown content.
 * This service is designed to be the central place for converting
 * user-provided files into a text-based format that can be injected
 * into a model's context.
 */
export class FileParserService {
  private vlmService?: VLMService;

  constructor(vlmService?: VLMService) {
    this.vlmService = vlmService;
  }
  /**
   * Parses a file at the given path and returns its content as a Markdown string.
   * This method acts as a dispatcher, delegating to the appropriate parser
   * based on the file's extension.
   *
   * @param filePath The absolute path to the file.
   * @returns A promise that resolves to the Markdown content of the file.
   * @throws An error if the file type is not supported or file is too large.
   */
  public async parseFileToMarkdown(filePath: string): Promise<string> {
    const extension = path.extname(filePath).toLowerCase();
    const stats = await fs.stat(filePath);

    // Check file size limits
    const maxSize = extension === '.pdf' ? MAX_PDF_SIZE : MAX_FILE_SIZE;
    if (stats.size > maxSize) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
      throw new Error(`File is too large: ${sizeMB}MB (max: ${maxSizeMB}MB)`);
    }

    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);

    let content: string;
    switch (extension) {
      case '.docx':
      case '.doc':
        content = await this.parseDocx(fileBuffer, fileName);
        break;
      case '.pdf':
        content = await this.parsePdf(fileBuffer, fileName);
        break;
      case '.xlsx':
      case '.xls':
        content = await this.parseXlsx(fileBuffer, fileName);
        break;
      case '.pptx':
      case '.ppt':
        content = await this.parsePowerPoint(fileBuffer, fileName);
        break;
      case '.svg':
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.webp':
      case '.gif':
      case '.bmp':
        content = await this.parseImageWithVLM(filePath, fileBuffer);
        break;
      case '.txt':
      case '.md':
      case '.csv':
        content = await this.parseTextFile(fileBuffer, fileName);
        break;
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }

    return content;
  }

  /**
   * Parses a DOCX file buffer into Markdown with image placeholders.
   * @param buffer The file content as a Buffer.
   * @param fileName The name of the file being parsed.
   * @returns A promise that resolves to a Markdown string.
   */
  private async parseDocx(buffer: Buffer, fileName: string): Promise<string> {
    try {
      // Extract HTML with images using mammoth
      const result = await mammoth.convertToHtml({ buffer });

      if (result.messages.length > 0) {
        console.warn(`Warnings while parsing ${fileName}:`, result.messages);
      }

      let htmlContent = result.value;

      // Process images with VLM if available
      if (this.vlmService) {
        const imageRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
        const imageMatches = [...htmlContent.matchAll(imageRegex)];

        for (const match of imageMatches) {
          const [fullMatch, src] = match;
          if (src.startsWith('data:image/')) {
            try {
              // Extract base64 data from data URL
              const [mimeTypePart, base64Data] = src.split(',');
              const mimeType = mimeTypePart.match(/data:([^;]+)/)?.[1] || 'image/png';
              const imageBuffer = Buffer.from(base64Data, 'base64');

              console.log(`[DocX VLM Debug] Processing embedded image: ${mimeType}, size: ${imageBuffer.length} bytes`);

              // Check image size limit (20MB)
              const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
              if (imageBuffer.length > MAX_IMAGE_SIZE) {
                console.warn(`[DocX VLM Debug] Image too large (${imageBuffer.length} bytes), skipping VLM description`);
                htmlContent = htmlContent.replace(fullMatch, `<p>[Image too large: ${(imageBuffer.length / (1024 * 1024)).toFixed(2)}MB]</p>`);
                continue;
              }

              const description = await this.vlmService.describeImage(imageBuffer, mimeType);
              console.log(`[DocX VLM Debug] Image description generated: ${description.substring(0, 100)}...`);
              htmlContent = htmlContent.replace(fullMatch, `<p>[Image: ${description}]</p>`);
            } catch (error) {
              console.warn(`[DocX VLM Debug] Failed to describe image:`, error);
              htmlContent = htmlContent.replace(fullMatch, '<p>[Image: Description not available]</p>');
            }
          } else {
            // Not a data URL, keep as placeholder
            htmlContent = htmlContent.replace(fullMatch, '<p>[Image: External image reference]</p>');
          }
        }
      } else {
        // No VLM service available, replace all images with placeholders
        htmlContent = htmlContent.replace(/<img[^>]*>/g, '<p>[Image: VLM service not configured]</p>');
      }

      // Convert HTML to Markdown
      const markdown = htmlContent
        .replace(/<h1[^>]*>/g, '# ')
        .replace(/<h2[^>]*>/g, '## ')
        .replace(/<h3[^>]*>/g, '### ')
        .replace(/<h4[^>]*>/g, '#### ')
        .replace(/<h5[^>]*>/g, '##### ')
        .replace(/<h6[^>]*>/g, '###### ')
        .replace(/<\/h[1-6]>/g, '\n\n')
        .replace(/<p[^>]*>/g, '')
        .replace(/<\/p>/g, '\n\n')
        .replace(/<strong[^>]*>/g, '**')
        .replace(/<\/strong>/g, '**')
        .replace(/<em[^>]*>/g, '*')
        .replace(/<\/em>/g, '*')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<ul[^>]*>/g, '\n')
        .replace(/<\/ul>/g, '\n')
        .replace(/<ol[^>]*>/g, '\n')
        .replace(/<\/ol>/g, '\n')
        .replace(/<li[^>]*>/g, '- ')
        .replace(/<\/li>/g, '\n')
        .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
        .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
        .trim();

      return `# ${fileName}\n\n${markdown}`;
    } catch (error) {
      console.error(`Error parsing DOCX file ${fileName}:`, error);
      throw new Error(`Failed to parse DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parses a PDF file buffer and extracts its text content.
   * Note: This is a simple text extraction. For layout-heavy PDFs,
   * a VLM-based approach would yield better results.
   * @param buffer The file content as a Buffer.
   * @param fileName The name of the file being parsed.
   * @returns A promise that resolves to the extracted text as a string.
   */
  private async parsePdf(buffer: Buffer, fileName: string): Promise<string> {
    try {
      // Dynamic import to avoid debug mode execution issues with pdf-parse
      const pdf = (await import('pdf-parse')).default;
      const data = await pdf(buffer);
      let text = data.text;

      // Basic formatting improvements
      text = text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/([.!?])\s*\n([A-Z])/g, '$1\n\n$2') // Add paragraph breaks after sentences
        .trim();

      const pageInfo = data.numpages > 1 ? ` (${data.numpages} pages)` : '';
      return `# ${fileName}${pageInfo}\n\n${text}`;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parses an XLSX/XLS file buffer into formatted Markdown.
   * Handles multiple sheets and provides better formatting.
   * @param buffer The file content as a Buffer.
   * @param fileName The name of the file being parsed.
   * @returns A promise that resolves to a Markdown string.
   */
  private async parseXlsx(buffer: Buffer, fileName: string): Promise<string> {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
      let markdown = `# ${fileName}\n\n`;

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json<any[]>(worksheet, {
          header: 1,
          defval: '',
          blankrows: false
        });

        if (jsonData.length === 0) {
          continue;
        }

        // Add sheet name as heading
        markdown += `## ${sheetName}\n\n`;

        // Check if data looks like a table (has consistent columns)
        const firstRowLength = (jsonData[0] as any[]).length;
        const isTable = jsonData.slice(0, 5).every((row: any[]) =>
          Array.isArray(row) && row.length === firstRowLength
        );

        if (isTable && jsonData.length > 1) {
          // Format as table
          const header = (jsonData[0] as any[]).map(cell => String(cell || ''));
          const rows = jsonData.slice(1) as any[][];

          // Create markdown table
          markdown += `| ${header.join(' | ')} |\n`;
          markdown += `| ${header.map(() => '---').join(' | ')} |\n`;

          rows.forEach((row) => {
            const formattedRow = row.map(cell => {
              if (cell === null || cell === undefined) return '';
              if (cell instanceof Date) return cell.toLocaleDateString();
              if (typeof cell === 'number') return cell.toLocaleString();
              return String(cell).replace(/\|/g, '\\|').replace(/\n/g, ' ');
            });
            markdown += `| ${formattedRow.join(' | ')} |\n`;
          });
        } else {
          // Format as list for non-tabular data
          jsonData.forEach((row: any, index: number) => {
            if (Array.isArray(row)) {
              const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && cell !== '');
              if (nonEmptyCells.length > 0) {
                markdown += `${index + 1}. ${nonEmptyCells.join(' - ')}\n`;
              }
            } else if (row) {
              markdown += `- ${row}\n`;
            }
          });
        }

        markdown += '\n';
      }

      return markdown.trim();
    } catch (error) {
      console.error('Excel parsing error:', error);
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parses PowerPoint files (PPTX/PPT) into Markdown.
   * @param buffer The file content as a Buffer.
   * @param fileName The name of the file being parsed.
   * @returns A promise that resolves to a Markdown string.
   */
  private async parsePowerPoint(buffer: Buffer, fileName: string): Promise<string> {
    try {
      // For now, we'll use xlsx to read PPTX as it can handle basic text extraction
      // In a full implementation, you'd use a specialized library like python-pptx
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      let markdown = `# ${fileName}\n\n`;

      if (workbook.SheetNames.length > 0) {
        // Try to extract any readable text
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const text = xlsx.utils.sheet_to_txt(worksheet);
          if (text.trim()) {
            markdown += `## Slide Content\n\n${text}\n\n`;
          }
        }
      }

      // If no content extracted, provide a message
      if (markdown === `# ${fileName}\n\n`) {
        markdown += '*Note: PowerPoint file parsing is limited. For best results, export to PDF or use a specialized PowerPoint parsing service.*\n';
      }

      return markdown.trim();
    } catch (error) {
      // Fallback message
      return `# ${fileName}\n\n*PowerPoint file detected. Full parsing support is not yet implemented. Please export to PDF for better text extraction.*`;
    }
  }

  /**
   * Parses plain text files (TXT, MD, CSV) into Markdown.
   * @param buffer The file content as a Buffer.
   * @param fileName The name of the file being parsed.
   * @returns A promise that resolves to a Markdown string.
   */
  private async parseTextFile(buffer: Buffer, fileName: string): Promise<string> {
    const text = buffer.toString('utf-8');
    const extension = path.extname(fileName).toLowerCase();

    if (extension === '.csv') {
      // Parse CSV as table
      try {
        const lines = text.trim().split('\n');
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim());
          let markdown = `# ${fileName}\n\n`;
          markdown += `| ${headers.join(' | ')} |\n`;
          markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;

          for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(',').map(c => c.trim());
            markdown += `| ${cells.join(' | ')} |\n`;
          }

          return markdown;
        }
      } catch (error) {
        // If CSV parsing fails, return as plain text
      }
    }

    return `# ${fileName}\n\n${text}`;
  }

  /**
   * Parses an image file using a Vision Language Model (VLM) if available.
   * Falls back to a placeholder if VLM is not configured.
   *
   * @param filePath The path to the file, which might be needed by the VLM.
   * @param buffer The file content as a Buffer.
   * @returns A promise that resolves to a description of the image in Markdown.
   */
  private async parseImageWithVLM(
    filePath: string,
    buffer: Buffer
  ): Promise<string> {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).substring(1);
    const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

    if (this.vlmService) {
      try {
        const description = await this.vlmService.describeImage(buffer, mimeType);
        return `# ${fileName}\n\n![${fileName}]\n\n## Image Description\n\n${description}`;
      } catch (error) {
        console.warn(`VLM parsing failed for ${filePath}:`, error);
      }
    }

    // Fallback: Include limited base64 image for display
    const base64Image = buffer.toString('base64');

    // Limit base64 output length to prevent overwhelming output
    const MAX_BASE64_DISPLAY_LENGTH = 200; // Show only first 200 characters
    const displayBase64 = base64Image.length > MAX_BASE64_DISPLAY_LENGTH
      ? `${base64Image.substring(0, MAX_BASE64_DISPLAY_LENGTH)}... (${base64Image.length - MAX_BASE64_DISPLAY_LENGTH} more characters)`
      : base64Image;

    return `# ${fileName}\n\n![${fileName}](data:${mimeType};base64,${displayBase64})\n\n*[Image description not available - VLM service not configured]*`;
  }
}
