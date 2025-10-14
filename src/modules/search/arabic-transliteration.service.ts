import axios from "axios";

export class QCRIArabicTransliterationService {
  private readonly QCRI_AR2EN_NBEST_ENDPOINT = "https://transliterate.qcri.org/ar2en/nbest/{}";
  private readonly QCRI_EN2AR_ENDPOINT = "https://transliterate.qcri.org/en2ar/{}";

  /**
   * Transliterate Arabic text to English using QCRI API
   * Returns multiple possible transliterations
   */
  async transliterateNbestArabicToEnglish(text: string): Promise<string[]> {
    try {
      const url = this.QCRI_AR2EN_NBEST_ENDPOINT.replace("{}", encodeURIComponent(text));
      const response = await axios.get(url);
      const data = response.data;
      
      return Object.values(data.results) as string[];
    } catch (error) {
      console.error("Arabic transliteration error:", error);
      // Fallback to original text if API fails
      return [text];
    }
  }

  /**
   * Transliterate English text to Arabic using QCRI API
   */
  async transliterateEnglishToArabic(text: string): Promise<string> {
    try {
      const url = this.QCRI_EN2AR_ENDPOINT.replace("{}", encodeURIComponent(text));
      const response = await axios.get(url);
      const data = response.data;
      
      return data.results;
    } catch (error) {
      console.error("English to Arabic transliteration error:", error);
      // Fallback to original text if API fails
      return text;
    }
  }

  /**
   * Check if text contains Arabic characters
   */
  isArabic(text: string): boolean {
    for (const letter of text) {
      const name = this.getUnicodeName(letter).toLowerCase();
      if (name.includes("arabic") || name.includes("persian")) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get Unicode name for a character
   */
  private getUnicodeName(char: string): string {
    try {
      // Simple implementation - in a real app you might want to use a proper Unicode library
      const codePoint = char.codePointAt(0);
      if (!codePoint) return "";
      
      // Basic Arabic/Persian Unicode ranges
      if (
        (codePoint >= 0x0600 && codePoint <= 0x06FF) || // Arabic
        (codePoint >= 0x0750 && codePoint <= 0x077F) || // Arabic Supplement
        (codePoint >= 0x08A0 && codePoint <= 0x08FF) || // Arabic Extended-A
        (codePoint >= 0xFB50 && codePoint <= 0xFDFF) || // Arabic Presentation Forms-A
        (codePoint >= 0xFE70 && codePoint <= 0xFEFF) || // Arabic Presentation Forms-B
        (codePoint >= 0x1EE00 && codePoint <= 0x1EEFF)   // Arabic Mathematical Alphabetic Symbols
      ) {
        return "arabic";
      }
      
      return "latin";
    } catch (error) {
      return "unknown";
    }
  }
}
