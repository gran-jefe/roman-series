import mammoth from 'mammoth'

const TOPIC_ALIASES: Record<string, string> = {
  'HUMANS AND ENVIRONMENT': 'HUMAN AND ENVIRONMENT',
}

function normalizeTopicName(name: string): string {
  const upper = name.trim().toUpperCase()
  return TOPIC_ALIASES[upper] ?? upper
}

function isTopicHeading(line: string): boolean {
  const s = line.trim()
  if (!s) return false
  if (s.includes('\t')) return false
  if (s.length < 4) return false
  // Must not start with a digit
  if (/^\d/.test(s)) return false
  // Must not start with a single letter followed by dot (option label)
  if (/^[A-E]\.\s/.test(s)) return false
  // Must be ALL CAPS (allow spaces, digits, special chars like & / : , . -)
  if (!/^[A-Z][A-Z0-9\s\/\:&,\.\-\(\)]+$/.test(s)) return false
  // Must be multi-word (contains space) OR be a known single-word topic OR be a long technical term (8+ chars)
  const singleWordTopics = new Set([
    'NUTRITION', 'TRANSPORT', 'RESPIRATION', 'EXCRETION',
    'REPRODUCTION', 'GROWTH', 'HEREDITY', 'ECOLOGY',
    'SOLUTIONS', 'INTRODUCTION', 'ACKNOWLEDGEMENT'
  ])
  if (!s.includes(' ') && !singleWordTopics.has(s) && s.length < 8) return false
  // Must not be too long to be a topic (topics are usually < 100 chars)
  if (s.length > 120) return false
  // Must not look like a question fragment (contain roman numerals pattern)
  if (/\b(I{1,3}|IV|V|VI{0,3})\.\s/.test(s)) return false
  // Exclude known false positives
  const KNOWN_FALSE_POSITIVES = new Set(['CLASS INSECTA'])
  if (KNOWN_FALSE_POSITIVES.has(s)) return false

  return true
}

function extractAnswerLetter(blockText: string): string | null {
  // Pattern 1: ANSWER/ANS/Answers + colon/hyphen/en-dash/em-dash + optional number + letter
  let m = blockText.match(
    /(?:ANSWER|ANS|Answers?)[\s:\-–—]+(?:\d+[\.\)]\s*)?([A-E])\b/i
  )
  if (m) return m[1].toUpperCase()

  // Pattern 2: "N. X-" or "N. X." — letter immediately after question number
  m = blockText.match(/^\d+\.\s+([A-E])[\-\.\s–—]/)
  if (m) return m[1].toUpperCase()

  // Pattern 3: "correct answer is [option] X"
  m = blockText.match(/correct\s+answer\s+is\s+(?:option\s+)?([A-E])\b/i)
  if (m) return m[1].toUpperCase()

  // Pattern 4: "[The] [correct] answer is X"
  m = blockText.match(/(?:correct\s+)?answer\s+is\s+(?:option\s+)?([A-E])\b/i)
  if (m) return m[1].toUpperCase()

  // Pattern 5: "X is [therefore] correct"
  m = blockText.match(/\b([A-E])\s+is\s+(?:therefore\s+)?correct\b/i)
  if (m) return m[1].toUpperCase()

  // Pattern 6: "is: X." — letter right after "is:"
  m = blockText.match(/\bis[:\s]+([A-E])[\.\s]/i)
  if (m) return m[1].toUpperCase()

  // Pattern 7: "(option X)" anywhere in block
  m = blockText.match(/\(option\s+([A-E])\)/i)
  if (m) return m[1].toUpperCase()

  return null
}

interface ParsedOption {
  label: string
  body: string
  is_correct: boolean
}

interface ParsedQuestion {
  number: number
  topic: string
  body: string
  explanation: string | null
  options: ParsedOption[]
}

export interface ParseResult {
  questions: ParsedQuestion[]
  topics: string[]
  total_parsed: number
  total_matched: number
  total_unmatched: number
  errors: string[]
}

function parseIntoTopicSections(
  content: string,
  allowedTopics?: Set<string>
): Array<{topic: string, text: string}> {
  const sections: Array<{topic: string, text: string}> = []
  let currentTopic = 'General'
  let currentLines: string[] = []

  for (const line of content.split('\n')) {
    if (isTopicHeading(line) && line.trim().toUpperCase() !== 'SOLUTIONS') {
      const normalized = normalizeTopicName(line.trim().toUpperCase())
      // Only split on this heading if no whitelist, or it's in the whitelist
      if (!allowedTopics || allowedTopics.has(normalized)) {
        if (currentLines.length > 0) {
          sections.push({ topic: currentTopic, text: currentLines.join('\n') })
        }
        currentTopic = line.trim().toUpperCase()
        currentLines = []
      } else {
        // Not in whitelist, treat as regular content
        currentLines.push(line)
      }
    } else {
      currentLines.push(line)
    }
  }
  if (currentLines.length > 0) {
    sections.push({ topic: currentTopic, text: currentLines.join('\n') })
  }
  return sections
}

function parseQuestionsFromSection(topic: string, text: string): Omit<ParsedQuestion, 'explanation'>[] {
  const results: Omit<ParsedQuestion, 'explanation'>[] = []
  const blocks = text.split(/\n(?=\s*\d+[\.\)]\s)/)

  for (const block of blocks) {
    const b = block.trim()
    if (!b) continue

    const numMatch = b.match(/^(\d+)[\.\)]\s*/)
    if (!numMatch) continue
    const qnum = parseInt(numMatch[1])

    const parts = b.split(/\s+(?=[A-E]\.\s)/)
    if (parts.length < 3) continue

    const body = parts[0].trim()
    const options: ParsedOption[] = []

    for (let i = 1; i < parts.length; i++) {
      const om = parts[i].match(/^([A-E])\.\s+(.+)/s)
      if (om) {
        options.push({ label: om[1], body: om[2].trim(), is_correct: false })
      }
    }

    if (options.length >= 2) {
      results.push({ number: qnum, topic, body, options })
    }
  }
  return results
}

export async function parseRomanSeriesDocument(buffer: Buffer): Promise<ParseResult> {
  const errors: string[] = []

  try {
    console.log('[Parser] Starting parse, buffer size:', buffer.length)

    // Extract raw text from docx
    let result
    try {
      result = await mammoth.extractRawText({ buffer })
    } catch (e) {
      console.error('[Parser] Mammoth extraction error:', e)
      throw e
    }

    const text = result.value

    console.log('[Parser] Extracted text length:', text.length)
    const solMatch = text.match(/\nSOLUTIONS\s*\n/)
    const solIdx = solMatch ? text.indexOf(solMatch[0]) + 1 : -1
    console.log('[Parser] SOLUTIONS found at:', solIdx)

    // Split at SOLUTIONS heading
    if (solIdx === -1) {
      console.log('[Parser] SOLUTIONS section not found')
      return {
        questions: [],
        topics: [],
        total_parsed: 0,
        total_matched: 0,
        total_unmatched: 0,
        errors: ['Could not find SOLUTIONS section in document'],
      }
    }

    const questionsText = text.substring(0, solIdx)
    const solutionsText = text.substring(solIdx)

    // Find first real topic heading (preserves LIVING ORGANISMS, skips TOC)
    const firstTopicMatch = questionsText.match(/\n(LIVING ORGANISMS:[^\t\n]+)\n/)
    const questionsContent = firstTopicMatch
      ? questionsText.substring(questionsText.indexOf(firstTopicMatch[0]) + 1)
      : questionsText

    // Parse questions by topic
    const qSections = parseIntoTopicSections(questionsContent)
    const allQuestions: Omit<ParsedQuestion, 'explanation'>[] = []
    for (const { topic, text: sectionText } of qSections) {
      allQuestions.push(...parseQuestionsFromSection(topic, sectionText))
    }

    // Build set of known topics from questions
    const knownTopics = new Set(
      qSections.map(s => normalizeTopicName(s.topic))
    )

    // Parse solutions by topic using key-based indexing, whitelisting known topics
    const sSections = parseIntoTopicSections(solutionsText, knownTopics)
    const answerMap: Map<string, {answer: string | null, explanation: string}> = new Map()

    for (const { topic, text: sectionText } of sSections) {
      const blocks = sectionText.split(/\n(?=\s*\d+[\.\)]\s)/)

      for (const block of blocks) {
        const b = block.trim()
        if (!b) continue
        const numMatch = b.match(/^(\d+)[\.\)]\s*/)
        if (!numMatch) continue
        const snum = parseInt(numMatch[1])
        const answer = extractAnswerLetter(b)
        const key = `${normalizeTopicName(topic)}::${snum}`
        answerMap.set(key, { answer, explanation: b })
      }
    }

    // Match questions to solutions
    let matched = 0
    let unmatched = 0
    const finalQuestions: ParsedQuestion[] = []

    for (const q of allQuestions) {
      const key = `${normalizeTopicName(q.topic)}::${q.number}`
      const sol = answerMap.get(key)

      if (sol) {
        matched++
        finalQuestions.push({
          ...q,
          explanation: sol.explanation,
          options: q.options.map(o => ({ ...o, is_correct: o.label === sol.answer })),
        })
      } else {
        unmatched++
        errors.push(`Q${q.number} (${q.topic.substring(0, 30)}): no answer found`)
        finalQuestions.push({ ...q, explanation: null })
      }
    }

    // Extract unique topic names (preserve original casing from questions)
    const topicsFound = [...new Set(allQuestions.map(q => q.topic))]

    console.log('[Parser] Complete - parsed:', allQuestions.length, 'matched:', matched, 'unmatched:', unmatched)
    if (errors.length > 0) {
      console.log('[Parser] Unmatched questions:', errors.filter(e => e.includes('no answer found')))
    }

    return {
      questions: finalQuestions,
      topics: topicsFound,
      total_parsed: allQuestions.length,
      total_matched: matched,
      total_unmatched: unmatched,
      errors,
    }
  } catch (e) {
    console.error('[Parser] Fatal error:', e)
    return {
      questions: [],
      topics: [],
      total_parsed: 0,
      total_matched: 0,
      total_unmatched: 0,
      errors: [`Parser error: ${e instanceof Error ? e.message : String(e)}`],
    }
  }
}
