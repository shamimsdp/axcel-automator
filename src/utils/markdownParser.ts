import { AspectRatio, PromptItem, VideoDuration, VideoResolution, VideoModel, GenerationMode } from '../types';

export interface ParseOptions {
  defaultDuration?: VideoDuration;
  defaultResolution?: VideoResolution;
  defaultAspectRatio?: AspectRatio;
  defaultGenerateAudio?: boolean;
}

const DEFAULT_OPTIONS: Required<ParseOptions> = {
  defaultDuration: '5s',
  defaultResolution: '720p',
  defaultAspectRatio: '16:9',
  defaultGenerateAudio: true,
};

/**
 * Parses markdown, text, or document text into structured PromptItems.
 * Supports:
 * - Markdown Headings (# Scene 1: Cityscape)
 * - Numbered lists (1. A futuristic drone flying...)
 * - Bulleted lists (- A serene sunset over...)
 * - Explicit delimiters (--- or ===)
 * - Inline tags like [16:9, 10s, 1080p, audio]
 */
export function parseMarkdownToPrompts(
  content: string,
  options: ParseOptions = {}
): PromptItem[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const trimmed = content.trim();
  if (!trimmed) return [];

  const rawBlocks = splitIntoCandidateBlocks(trimmed);
  const items: PromptItem[] = [];

  let indexCounter = 1;

  for (const block of rawBlocks) {
    const parsed = parseSingleBlock(block, indexCounter, opts);
    if (parsed) {
      items.push(parsed);
      indexCounter++;
    }
  }

  return items;
}

function splitIntoCandidateBlocks(text: string): string[] {
  // If the text contains horizontal dividers '---' or '===', split by them
  if (/(?:^|\n)(?:---|===)\s*(?:\n|$)/.test(text)) {
    return text
      .split(/(?:^|\n)(?:---|===)\s*(?:\n|$)/)
      .map(b => b.trim())
      .filter(Boolean);
  }

  // If text has markdown scene/prompt headers (# Scene, ## Prompt, etc., with optional escaped backslash)
  if (/(?:^|\n)\s*\\?#{1,4}\s+[^\n]+/i.test(text)) {
    const lines = text.split('\n');
    const sections: string[] = [];
    let currentSection: string[] = [];

    for (const line of lines) {
      if (/^\s*\\?#{1,4}\s+[^\n]+/.test(line)) {
        if (currentSection.length > 0) {
          sections.push(currentSection.join('\n').trim());
          currentSection = [];
        }
      }
      currentSection.push(line);
    }
    if (currentSection.length > 0) {
      sections.push(currentSection.join('\n').trim());
    }
    return sections.filter(Boolean);
  }

  // If text is numbered list (1. ..., 2. ...)
  const numberedPattern = /(?:^|\n)\s*(\d+)[\.\)]\s+/g;
  const matches = [...text.matchAll(numberedPattern)];
  if (matches.length >= 2) {
    const chunks: string[] = [];
    let lastIndex = 0;
    for (let i = 0; i < matches.length; i++) {
      const matchPos = matches[i].index ?? 0;
      if (i > 0) {
        chunks.push(text.slice(lastIndex, matchPos).trim());
      }
      lastIndex = matchPos;
    }
    if (lastIndex < text.length) {
      chunks.push(text.slice(lastIndex).trim());
    }
    return chunks.filter(Boolean);
  }

  // Fallback: Split by double newlines
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  return paragraphs;
}

function parseSingleBlock(
  block: string,
  index: number,
  opts: Required<ParseOptions>
): PromptItem | null {
  const lines = block
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  let title = `Video ${index}`;
  const bodyLines: string[] = [];

  // Check if first line is a header or numbered label
  const firstLine = lines[0];
  const headerMatch = firstLine.match(/^\s*\\?#{1,4}\s+(.+)$/);
  const numberedMatch = firstLine.match(/^\s*\d+[\.\)]\s*(.+)$/);

  if (headerMatch) {
    title = headerMatch[1].replace(/\\([#\[\]*_\-.!`~\\:])/g, '$1').trim();
    bodyLines.push(...lines.slice(1));
  } else if (numberedMatch && lines.length > 1) {
    title = `Scene ${index}: ${numberedMatch[1].slice(0, 30)}`;
    bodyLines.push(...lines.slice(1));
  } else if (numberedMatch && lines.length === 1) {
    title = `Scene ${index}`;
    bodyLines.push(numberedMatch[1]);
  } else {
    // Check if starts with a bullet
    const bulletMatch = firstLine.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      bodyLines.push(bulletMatch[1], ...lines.slice(1));
    } else {
      bodyLines.push(...lines);
    }
  }

  let prompt = bodyLines.join(' ').trim();
  if (!prompt && title) {
    // If only title exists, treat title as prompt
    prompt = title;
    title = `Video ${index}`;
  }

  if (!prompt) return null;

  // Extract reference image if present: ![alt](url) or [image: url]
  let referenceImage: string | undefined;
  let referenceImageName: string | undefined;

  const imgMatch = prompt.match(/!\[(.*?)\]\((.*?)\)/);
  if (imgMatch) {
    referenceImageName = imgMatch[1] || 'reference.png';
    referenceImage = imgMatch[2];
    prompt = prompt.replace(imgMatch[0], '').trim();
  }

  // Extract inline parameter overrides, e.g. [16:9, 30s, 1080p, audio, Seedance 2.5]
  const tagExtract = extractParameters(prompt, opts);
  prompt = tagExtract.cleanedPrompt;

  if (!referenceImage && tagExtract.referenceImage) {
    referenceImage = tagExtract.referenceImage;
    referenceImageName = tagExtract.referenceImageName;
  }

  // Remove markdown bold/italic decorators if any
  prompt = prompt.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');

  const model: VideoModel = tagExtract.model || (tagExtract.duration === '30s' ? 'Seedance 2.5' : 'Seedance 2.5');
  const generationMode: GenerationMode = referenceImage ? 'image-to-video' : 'text-to-video';

  return {
    id: `prompt-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    index,
    title,
    prompt,
    duration: tagExtract.duration,
    resolution: tagExtract.resolution,
    aspectRatio: tagExtract.aspectRatio,
    generateAudio: tagExtract.generateAudio,
    charCount: prompt.length,
    model,
    generationMode,
    referenceImage,
    referenceImageName,
  };
}

function extractParameters(
  prompt: string,
  opts: Required<ParseOptions>
): {
  cleanedPrompt: string;
  duration: VideoDuration;
  resolution: VideoResolution;
  aspectRatio: AspectRatio;
  generateAudio: boolean;
  model?: VideoModel;
  referenceImage?: string;
  referenceImageName?: string;
} {
  let duration = opts.defaultDuration;
  let resolution = opts.defaultResolution;
  let aspectRatio = opts.defaultAspectRatio;
  let generateAudio = opts.defaultGenerateAudio;
  let model: VideoModel | undefined;
  let referenceImage: string | undefined;
  let referenceImageName: string | undefined;

  let cleaned = prompt;

  // Search for brackets [ ... ] containing settings (tolerates optional escaped brackets \[ \])
  const bracketMatches = prompt.match(/\\?\[(.*?)\\?\]/g);
  if (bracketMatches) {
    for (const match of bracketMatches) {
      const inner = match.replace(/^\\?\[/, '').replace(/\\?\]$/, '').trim();
      const lower = inner.toLowerCase();
      let recognized = false;

      // Aspect Ratio
      if (lower.includes('16:9')) { aspectRatio = '16:9'; recognized = true; }
      else if (lower.includes('9:16')) { aspectRatio = '9:16'; recognized = true; }
      else if (lower.includes('1:1')) { aspectRatio = '1:1'; recognized = true; }
      else if (lower.includes('3:4')) { aspectRatio = '3:4'; recognized = true; }
      else if (lower.includes('4:3')) { aspectRatio = '4:3'; recognized = true; }
      else if (lower.includes('21:9')) { aspectRatio = '21:9'; recognized = true; }

      // Duration: includes 30s (Seedance 2.5)
      if (/\b30s\b/.test(lower)) { duration = '30s'; model = 'Seedance 2.5'; recognized = true; }
      else if (/\b5s\b/.test(lower)) { duration = '5s'; recognized = true; }
      else if (/\b8s\b/.test(lower)) { duration = '8s'; recognized = true; }
      else if (/\b10s\b/.test(lower)) { duration = '10s'; recognized = true; }
      else if (/\b12s\b/.test(lower)) { duration = '12s'; recognized = true; }
      else if (/\b15s\b/.test(lower)) { duration = '15s'; recognized = true; }

      // Model
      if (lower.includes('seedance 2.5') || lower.includes('seedance2.5') || lower.includes('s2.5')) {
        model = 'Seedance 2.5';
        recognized = true;
      } else if (lower.includes('seedance 2.0') || lower.includes('seedance2.0') || lower.includes('s2.0')) {
        model = 'Seedance 2.0';
        recognized = true;
      }

      // Resolution
      if (lower.includes('480p')) { resolution = '480p'; recognized = true; }
      else if (lower.includes('720p')) { resolution = '720p'; recognized = true; }
      else if (lower.includes('1080p')) { resolution = '1080p'; recognized = true; }

      // Audio: default is ON; check for explicit no-audio or audio toggle
      if (lower.includes('no-audio') || lower.includes('no audio') || lower.includes('audio off') || lower.includes('mute')) {
        generateAudio = false;
        recognized = true;
      } else if (lower.includes('audio') || lower.includes('voice') || lower.includes('sound')) {
        generateAudio = true;
        recognized = true;
      }

      // Inline image/ref tag, e.g. [image: https://...] or [ref: sample.png]
      const imgTagMatch = inner.match(/^(?:image|ref|reference):\s*(.+)$/i);
      if (imgTagMatch) {
        referenceImage = imgTagMatch[1].trim();
        referenceImageName = referenceImage.split('/').pop() || 'reference.png';
        recognized = true;
      }

      if (recognized) {
        cleaned = cleaned.replace(match, '').trim();
      }
    }
  }

  return {
    cleanedPrompt: cleaned.replace(/\s+/g, ' ').trim(),
    duration,
    resolution,
    aspectRatio,
    generateAudio,
    model,
    referenceImage,
    referenceImageName,
  };
}

export function exportPromptsToMarkdown(prompts: PromptItem[]): string {
  return prompts
    .map((p, idx) => {
      const modelTag = p.model ? `, ${p.model}` : '';
      const tags = `[${p.aspectRatio}, ${p.duration}, ${p.resolution}${p.generateAudio ? ', audio' : ''}${modelTag}]`;
      const imgLine = p.referenceImage ? `![${p.referenceImageName || 'Reference Image'}](${p.referenceImage})\n` : '';
      return `## Scene ${idx + 1}: ${p.title}\n${tags}\n${imgLine}${p.prompt}\n`;
    })
    .join('\n---\n\n');
}
