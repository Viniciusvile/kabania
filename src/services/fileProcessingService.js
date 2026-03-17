import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import Papa from 'papaparse';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Service to handle file reading and text extraction.
 */
export const fileProcessingService = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB limit
  SUPPORTED_FORMATS: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv'],

  /**
   * Main entry point to process a file.
   */
  async extractText(file) {
    // 1. Validate file
    this.validateFile(file);

    const type = file.type;
    console.log(`Processing file type: ${type}`);

    // 2. route to specific extractor
    if (type === 'application/pdf') {
      return await this.extractTextFromPDF(file);
    } else if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await this.extractTextFromDocx(file);
    } else if (type === 'text/plain' || type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      return await this.extractTextFromPlain(file);
    } else {
      throw new Error(`Formato de arquivo não suportado: ${file.name}`);
    }
  },

  validateFile(file) {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('Arquivo muito grande. O limite é de 5MB.');
    }
  },

  async extractTextFromPlain(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(this.sanitizeText(reader.result));
      reader.onerror = () => reject(new Error('Erro ao ler arquivo de texto.'));
      reader.readAsText(file);
    });
  },

  async extractTextFromPDF(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      return this.sanitizeText(fullText);
    } catch (err) {
      console.error('PDF extraction error:', err);
      throw new Error('Falha ao extrair texto do PDF.');
    }
  },

  async extractTextFromDocx(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return this.sanitizeText(result.value);
    } catch (err) {
      console.error('DOCX extraction error:', err);
      throw new Error('Falha ao extrair texto do DOCX.');
    }
  },

  sanitizeText(text) {
    if (!text) return '';
    // Basic sanitation: remove excessive whitespace and control characters
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // remove control chars
      .replace(/\s+/g, ' ') // collapse whitespaces
      .trim()
      .substring(0, 20000); // Limit total text to avoid overwhelming IA context (20k chars is plenty for KB)
  }
};
