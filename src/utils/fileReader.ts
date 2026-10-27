import mammoth from 'mammoth';
import JSZip from 'jszip';

/**
 * Reads any uploaded document (.docx, .doc, .md, .txt) and extracts clean plain text/markdown.
 * Accurately detects binary DOCX files and unpacks document XML instead of showing raw PK zip bytes.
 */
export async function readDocumentFile(file: File | Blob): Promise<string> {
  const filename = (file as File).name?.toLowerCase() || '';

  // 1. Read first 4 bytes to check magic signature
  const headerBuffer = await file.slice(0, 4).arrayBuffer();
  const headerBytes = new Uint8Array(headerBuffer);
  const isZipOrDocx = headerBytes[0] === 0x50 && headerBytes[1] === 0x4b; // 'PK'
  const isLegacyDoc =
    headerBytes[0] === 0xd0 &&
    headerBytes[1] === 0xcf &&
    headerBytes[2] === 0x11 &&
    headerBytes[3] === 0xe0; // OLE Compound File header

  // 2. Handle DOCX files
  if (isZipOrDocx || filename.endsWith('.docx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // In Node environment mammoth prefers { buffer }, in browser { arrayBuffer }
      let inputOptions: any = { arrayBuffer };
      if (typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function') {
        inputOptions = { buffer: Buffer.from(arrayBuffer) };
      }

      const mammothAny = mammoth as any;
      // Try extractRawText first: extracts authentic paragraphs and headings without backslash escapes
      if (typeof mammothAny.extractRawText === 'function') {
        const rawResult = await mammothAny.extractRawText(inputOptions);
        if (rawResult?.value && rawResult.value.trim().length > 0) {
          return cleanExtractedText(rawResult.value);
        }
      }

      if (typeof mammothAny.convertToMarkdown === 'function') {
        const result = await mammothAny.convertToMarkdown(inputOptions);
        if (result?.value && result.value.trim().length > 0) {
          return cleanExtractedText(result.value);
        }
      }
    } catch (err) {
      console.warn('[Docx Reader] Mammoth parser failed, trying JSZip fallback:', err);
    }

    // Fallback: Use JSZip to directly read word/document.xml
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docXmlFile = zip.file('word/document.xml');
      if (docXmlFile) {
        const xmlText = await docXmlFile.async('string');
        const extracted = extractTextFromWordXml(xmlText);
        if (extracted.trim().length > 0) {
          return cleanExtractedText(extracted);
        }
      }
    } catch (zipErr) {
      console.error('[Docx Reader] JSZip fallback also failed:', zipErr);
    }
  }

  // 3. Handle Legacy Word .doc files
  if (isLegacyDoc || filename.endsWith('.doc')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = extractTextFromLegacyDoc(new Uint8Array(arrayBuffer));
      if (text.trim().length > 0) {
        return text;
      }
    } catch (docErr) {
      console.warn('[Doc Reader] Legacy .doc extraction failed:', docErr);
    }
  }

  // 4. Plain text, .md, .txt via standard Blob.text()
  try {
    const content = await file.text();
    // Sanity check: If text starts with PK zip header, warn user
    if (content.startsWith('PK\x03\x04') || content.includes('[Content_Types].xml')) {
      return '# Upload Error\n\nCould not parse binary Word document. Please ensure the file is a standard .docx, .md, or .txt file.';
    }
    return content;
  } catch (textErr) {
    // Legacy FileReader fallback
    return new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined') {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onload = e => resolve((e.target?.result as string) || '');
      reader.onerror = err => reject(err);
      reader.readAsText(file, 'utf-8');
    });
  }
}

/**
 * Extracts paragraphs and runs directly from raw word/document.xml
 */
function extractTextFromWordXml(xml: string): string {
  // Extract text from <w:p>...</w:p> paragraphs
  const paragraphRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/gi;
  const textRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi;

  const paragraphs: string[] = [];
  let pMatch: RegExpExecArray | null;

  while ((pMatch = paragraphRegex.exec(xml)) !== null) {
    const pContent = pMatch[1];
    let paragraphText = '';
    let tMatch: RegExpExecArray | null;

    while ((tMatch = textRegex.exec(pContent)) !== null) {
      paragraphText += tMatch[1];
    }

    const cleanP = paragraphText
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();

    if (cleanP) {
      paragraphs.push(cleanP);
    }
  }

  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n');
  }

  // Fallback: strip tags
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extracts printable ASCII/Unicode strings from binary legacy .doc
 */
function extractTextFromLegacyDoc(bytes: Uint8Array): string {
  let result = '';
  let currentWord = '';

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    // Printable characters + whitespace
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
      currentWord += String.fromCharCode(byte);
    } else {
      if (currentWord.trim().length >= 4) {
        result += currentWord.trim() + '\n';
      }
      currentWord = '';
    }
  }

  return cleanExtractedText(result);
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Mammoth escapes markdown characters (\#, \[, \], \*, \_, \-, \., \!). Unescape them so scenes parse cleanly
    .replace(/\\([#\[\]*_\-.!`~\\:])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

