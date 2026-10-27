import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { readDocumentFile } from './fileReader';

test('readDocumentFile extracts text from a binary docx archive without showing PK header', async () => {
  // Create an in-memory docx structure with JSZip
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t># Scene 1: Mars Exploration</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>[16:9, 10s, 1080p]</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>A crimson rover driving smoothly over rocky martian dunes with dust storm clearing.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', documentXml);
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types></Types>');

  const blob = await zip.generateAsync({ type: 'blob' });
  const file = new File([blob], 'sample_script.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const extractedText = await readDocumentFile(file);

  // Assertions: Should NOT contain PK or [Content_Types].xml
  assert.equal(extractedText.includes('PK\x03\x04'), false);
  assert.equal(extractedText.includes('[Content_Types].xml'), false);

  // Should contain our actual scene content!
  assert.match(extractedText, /Mars Exploration/);
  assert.match(extractedText, /crimson rover driving/);
});

test('readDocumentFile reads regular markdown files seamlessly', async () => {
  const mdContent = `# Scene 1: Arrival\n[16:9, 5s]\nA golden dawn over the mountain peaks.`;
  const file = new File([mdContent], 'script.md', { type: 'text/markdown' });

  const extractedText = await readDocumentFile(file);
  assert.equal(extractedText.trim(), mdContent.trim());
});
