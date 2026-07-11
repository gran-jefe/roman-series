import mammoth from "mammoth";

// Parses the raw-text format admins actually paste in for recalled questions:
// sections headed by "SUBJECT NAME YEAR" (e.g. "ENGLISH LANGUAGE 2025",
// "GOVERNMENT 2021"), question numbering that RESETS at 1 for each section,
// and options written either as separate "A. ..." lines or inline on the same
// line as "a) ... b) ... c) ...". There is no answer key anywhere in this
// format, so every option comes back with is_correct: false - the resulting
// questions are meant to be marked up by an admin afterward.

const SUBJECT_ALIASES: Record<string, string> = {
  "english language": "english",
};

const OPTION_LABELS = ["A", "B", "C", "D", "E"];
const HEADING_RE = /^([A-Z][A-Z\s]+?)\s+(\d{4})$/;

// Word docs often leave behind zero-width spaces (U+200B/U+200C/U+200D/U+FEFF)
// as invisible formatting artifacts - strip them so they don't silently ride
// along at the end of a question or option's text.
function cleanText(value: string): string {
  return value.replace(/[​‌‍﻿]/g, "").trim();
}

export interface ParsedRecalledQuestion {
  subject: string;
  year: number;
  body: string;
  options: { label: string; body: string }[];
}

export interface RecalledParseResult {
  questions: ParsedRecalledQuestion[];
  total_parsed: number;
  skipped_no_options: number;
  errors: string[];
}

function extractOptions(blockText: string): { stem: string; options: { label: string; body: string }[] } {
  const markerRe = /(^|\s)([A-Ea-e])[.)]\s+/g;
  const candidates: { index: number; letter: string; markerEnd: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = markerRe.exec(blockText)) !== null) {
    candidates.push({
      index: m.index + m[1].length,
      letter: m[2].toUpperCase(),
      markerEnd: m.index + m[0].length,
    });
  }

  // Only accept candidates that form a strict A, B, C, ... sequence - this is
  // what keeps a stray "a." mid-sentence from being mistaken for an option.
  const accepted: typeof candidates = [];
  let expected = 0;
  for (const cand of candidates) {
    if (expected < OPTION_LABELS.length && cand.letter === OPTION_LABELS[expected]) {
      accepted.push(cand);
      expected++;
    }
  }

  if (accepted.length < 2) {
    return { stem: cleanText(blockText), options: [] };
  }

  const stem = cleanText(blockText.substring(0, accepted[0].index));
  const options: { label: string; body: string }[] = [];

  for (let i = 0; i < accepted.length; i++) {
    const start = accepted[i].markerEnd;
    const end = i + 1 < accepted.length ? accepted[i + 1].index : blockText.length;
    const body = cleanText(blockText.substring(start, end));
    if (body) options.push({ label: OPTION_LABELS[i], body });
  }

  return { stem, options };
}

export function normalizeSubjectName(name: string): string {
  const key = name.trim().toLowerCase();
  return SUBJECT_ALIASES[key] || key;
}

export async function parseRecalledQuestionsDocument(buffer: Buffer): Promise<RecalledParseResult> {
  let text: string;
  try {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } catch (e) {
    return {
      questions: [],
      total_parsed: 0,
      skipped_no_options: 0,
      errors: [`Failed to read document: ${e instanceof Error ? e.message : String(e)}`],
    };
  }

  return parseRecalledQuestionsText(text);
}

export function parseRecalledQuestionsText(text: string): RecalledParseResult {
  const errors: string[] = [];
  const questions: ParsedRecalledQuestion[] = [];
  let skippedNoOptions = 0;

  // Split into (subject, year, sectionText) sections on heading lines.
  const sections: { subject: string; year: number; lines: string[] }[] = [];
  let current: { subject: string; year: number; lines: string[] } | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const headingMatch = line.match(HEADING_RE);

    if (headingMatch) {
      if (current) sections.push(current);
      current = { subject: headingMatch[1].trim(), year: parseInt(headingMatch[2], 10), lines: [] };
    } else if (current) {
      current.lines.push(rawLine);
    }
    // Lines before the first heading (if any) are ignored.
  }
  if (current) sections.push(current);

  if (sections.length === 0) {
    return {
      questions: [],
      total_parsed: 0,
      skipped_no_options: 0,
      errors: ["Couldn't find any \"SUBJECT NAME YEAR\" section headings in this document"],
    };
  }

  for (const section of sections) {
    const sectionText = section.lines.join("\n");
    // Question numbering resets per section, so split within each section.
    const blocks = sectionText.split(/\n(?=\s*\d+[.)]\s)/);

    for (const rawBlock of blocks) {
      const block = rawBlock.trim();
      if (!block) continue;

      const numMatch = block.match(/^(\d+)[.)]\s*/);
      if (!numMatch) continue;

      const afterNumber = block.substring(numMatch[0].length);
      const { stem, options } = extractOptions(afterNumber);

      if (!stem) continue;

      if (options.length < 2) {
        skippedNoOptions++;
        errors.push(
          `${section.subject} ${section.year}, Q${numMatch[1]}: no answer options found, skipped`
        );
        continue;
      }

      questions.push({
        subject: section.subject,
        year: section.year,
        body: stem,
        options,
      });
    }
  }

  return {
    questions,
    total_parsed: questions.length,
    skipped_no_options: skippedNoOptions,
    errors,
  };
}
