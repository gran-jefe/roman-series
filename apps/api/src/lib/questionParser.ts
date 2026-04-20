interface ParsedOption {
  label: 'A' | 'B' | 'C' | 'D';
  body: string;
  is_correct: boolean;
}

export interface ParsedQuestion {
  body: string;
  options: ParsedOption[];
  explanation: string | null;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  skipped: number;
  errors: string[];
}

export function parseQuestionsFromText(text: string): ParseResult {
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  let skipped = 0;

  // Split by question numbers (1., 2., 3., etc.)
  const questionBlocks = text.split(/\n(?=\d+\.\s)/);

  for (const block of questionBlocks) {
    if (!block.trim()) continue;

    try {
      const parsed = parseQuestionBlock(block);
      if (parsed) {
        questions.push(parsed);
      } else {
        skipped++;
      }
    } catch (error) {
      skipped++;
      errors.push(`Failed to parse question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { questions, skipped, errors };
}

function parseQuestionBlock(block: string): ParsedQuestion | null {
  const lines = block.split('\n').map(l => l.trim()).filter(l => l);

  if (lines.length < 6) return null; // At minimum: question, 4 options

  let idx = 0;

  // Skip question number (e.g., "1. Which of...")
  const firstLine = lines[idx];
  if (/^\d+\.\s/.test(firstLine)) {
    lines[idx] = firstLine.replace(/^\d+\.\s/, '');
  }

  // Collect question body (until we hit options or answer)
  const bodyLines: string[] = [];
  while (idx < lines.length && !/^[A-D]\.\s/.test(lines[idx]) && !/^Answer:\s*/i.test(lines[idx])) {
    bodyLines.push(lines[idx]);
    idx++;
  }

  if (bodyLines.length === 0) return null;

  const body = bodyLines.join(' ').trim();
  if (!body) return null;

  // Parse options A, B, C, D
  const options: ParsedOption[] = [];
  const optionLetters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  let correctAnswer = '';

  while (idx < lines.length && /^[A-D]\.\s/.test(lines[idx])) {
    const match = lines[idx].match(/^([A-D])\.\s(.+)$/);
    if (match) {
      const [, letter, optionBody] = match;
      options.push({
        label: letter as 'A' | 'B' | 'C' | 'D',
        body: optionBody,
        is_correct: false,
      });
    }
    idx++;
  }

  if (options.length !== 4) return null; // Must have exactly 4 options

  // Find correct answer
  while (idx < lines.length) {
    const line = lines[idx];
    if (/^Answer:\s*([A-D])/i.test(line)) {
      const match = line.match(/^Answer:\s*([A-D])/i);
      if (match) {
        correctAnswer = match[1];
      }
      idx++;
      break;
    }
    idx++;
  }

  if (!correctAnswer) return null; // Must have correct answer

  // Mark correct option
  const correctOption = options.find(o => o.label === correctAnswer);
  if (correctOption) {
    correctOption.is_correct = true;
  }

  // Collect explanation (remaining lines)
  const explanationLines: string[] = [];
  while (idx < lines.length) {
    const line = lines[idx].trim();
    if (line && !/^\d+\./.test(line)) {
      explanationLines.push(line);
    }
    idx++;
  }

  const explanation = explanationLines.length > 0 ? explanationLines.join(' ').trim() : null;

  return {
    body,
    options,
    explanation,
  };
}
