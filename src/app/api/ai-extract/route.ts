// @ts-nocheck
// FILE: src/app/api/ai-extract/route.ts
// ROUTE: POST /api/ai-extract
// PURPOSE: Extract questions and answers from uploaded files
//          Single file mode (questions + answers mixed) - one AI call
//          + smart answer pass (extract-or-solve) for questions with no answer
//          Returns questions/answers JSON
//          (و48) ملف الإجابات الاختياري اتشال بطلب المستر — مفيش وضع الملفين

import { NextResponse } from 'next/server'
import { callGemini as callGeminiCentral, hasGeminiKey } from '@/lib/gemini'
import { repairModelJson, repairCorruptMath } from '@/lib/math-text'
/* (و51) parser مقاوم لأي JSON مكسور — إصلاح جذري لـ «Could not parse AI response» */
import { parseAIJsonRobust } from '@/lib/ai-json'
/* (و45) تصنيف موحّد اختياري/مقالي — سؤال له اختيارات (حتى لو صور) = اختياري */
import { isWritingQuestion } from '@/lib/question-figures'
/* (و53) القص السيرفري اتشال من وقت الاستخراج (قص المتصفح الأول بجودة أعلى
   والسيرفر بقى إنقاذ بس عبر /api/crop-figures) */
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 180

function toBase64(file: File): Promise<string> {
  return file.arrayBuffer().then(function(buf) {
    return Buffer.from(new Uint8Array(buf)).toString('base64')
  })
}

function getMimeType(file: File): string {
  var fname = (file.name || '').toLowerCase()
  if (fname.endsWith('.pdf')) return 'application/pdf'
  if (fname.endsWith('.png')) return 'image/png'
  if (fname.endsWith('.webp')) return 'image/webp'
  return file.type || 'image/jpeg'
}

async function callGemini(apiKey: string, parts: any[]): Promise<any> {
  // Central helper: Gemini 3.6 first + auto model discovery + key rotation on quota (429)
  // (و51) response_mime_type: application/json — الموديل بيرجّع JSON صافي من غير
  //       أي نص حوالين/تنصيص ناقص — دي وقاية من المصدر قبل أي تصليح.
  console.log('[AI Extract] Calling Gemini (3.6 first, JSON mode, keys rotate on 429)')
  var result = await callGeminiCentral({
    parts: parts,
    generationConfig: { temperature: 0.1, maxOutputTokens: 16384, response_mime_type: 'application/json' },
    timeoutMs: 90000,
    thinking: 'low',
  })
  /* (و51) لو الموديل رفض الـ mime نفسه (400 نادر) → محاولة أخيرة من غيره */
  if (!result.ok) {
    console.warn('[AI Extract] JSON-mode failed, retrying without response_mime_type:', result.error)
    result = await callGeminiCentral({
      parts: parts,
      generationConfig: { temperature: 0.1, maxOutputTokens: 16384 },
      timeoutMs: 90000,
      thinking: 'low',
    })
  }
  if (result.ok) {
    console.log('[AI Extract] Model', result.model, 'succeeded')
    return { ok: true, text: result.text }
  }
  console.error('[AI Extract] All models failed:', result.error)
  return { ok: false, error: result.error || 'unknown' }
}

/*
 * normalizeMath — server-side cleanup of AI math output so the stored text
 * matches the canonical platform format that FractionText renders:
 *   - strip $…$ / $$…$$ wrappers
 *   - \\left( \\right) → plain parens
 *   - \\frac{(X)}{(Y)} → \\frac{X}{Y} (only when ONE paren pair wraps the
 *     whole numerator/denominator — (a+1)(a-1) stays untouched)
 */
function normalizeMath(s: string): string {
  if (!s) return s
  // first undo any JSON-escape corruption (\f eaten → "rac" …)
  var out = repairCorruptMath(String(s))
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, '$1').replace(/\$([^$\n]+?)\$/g, '$1')
  out = out.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '')
  out = out.replace(/\\frac\s*\{\s*\(([^{}]*)\)\s*\}\s*\{\s*\(([^{}]*)\)\s*\}/g, '\\frac{$1}{$2}')
  return out
}

/* (و51) الـ parser القديم اتشال — مكانه parseAIJsonRobust من '@/lib/ai-json'
   بيشمل كل طبقات و50 + إصلاح البتر الذكي + حروف التحكم الخام + code fences
   + تنصيص أحادي — كل واحدة معزولة ففشل واحدة مش بيمنع اللي بعدها */
function parseAIJson(text: string): any | null {
  return parseAIJsonRobust(text)
}

export async function POST(request) {
  try {
    var formData = await request.formData()
    var questionFile = formData.get('file') || formData.get('questionFile')
    var fileUrl = formData.get('fileUrl') || formData.get('questionUrl') || ''
    var type = formData.get('type') || 'exam'
    var grade = formData.get('grade') || ''

    console.log('[AI Extract] Request received:', {
      hasQuestionFile: !!(questionFile && questionFile.size > 0),
      fileUrl: fileUrl ? 'yes' : 'no',
      type: type,
      grade: grade,
    })

    if ((!questionFile || questionFile.size === 0) && !fileUrl.trim()) {
      return NextResponse.json({ error: 'Upload a question file or enter a URL' }, { status: 400 })
    }

    var apiKey = process.env.GEMINI_API_KEY || ''
    if (!hasGeminiKey()) {
      console.error('[AI Extract] GEMINI_API_KEY not found in environment')
      return NextResponse.json({ error: 'GEMINI_API_KEY not found — أضف المفتاح في Vercel Environment Variables أو ملف .env.local' }, { status: 500 })
    }

    // ============= Load question file (or URL) =============
    var qPart: any = null
    /* (و49) مصدر القص السيرفري — الملف/اللينك أصله واصل هنا فبنقص منه هنا */
    var cropSrc: { base64: string; name: string; mime: string } | null = null
    var hasQuestionFile = questionFile && questionFile.size > 0
    if (hasQuestionFile) {
      var qBase64 = await toBase64(questionFile)
      qPart = { inlineData: { mimeType: getMimeType(questionFile), data: qBase64 } }
      cropSrc = { base64: qBase64, name: String((questionFile as any).name || 'source'), mime: getMimeType(questionFile) }
    } else if (fileUrl.trim()) {
      try {
        var fetchRes = await fetch(fileUrl.trim())
        if (!fetchRes.ok) throw new Error('Download failed: ' + fetchRes.status)
        var arrayBuf = await fetchRes.arrayBuffer()
        var qBase64Url = Buffer.from(new Uint8Array(arrayBuf)).toString('base64')
        var ct = fetchRes.headers.get('content-type') || ''
        var qMime = ct.includes('pdf') ? 'application/pdf' : ct.includes('png') ? 'image/png' : ct.includes('webp') ? 'image/webp' : ct.includes('image') ? ct : 'image/jpeg'
        qPart = { inlineData: { mimeType: qMime, data: qBase64Url } }
        cropSrc = { base64: qBase64Url, name: fileUrl.trim().split('?')[0].split('/').pop() || 'source-link', mime: qMime }
      } catch (err) {
        return NextResponse.json({ error: 'Failed to download question file' }, { status: 400 })
      }
    }

    // ============= SINGLE FILE (questions + answers together) =============
    var singlePrompt = buildSingleFilePrompt(grade, type)
      var singleParts = [{ text: singlePrompt }, qPart]
      var singleRes = await callGemini(apiKey, singleParts)
      if (!singleRes.ok) {
        return NextResponse.json({ error: 'AI error: ' + singleRes.error }, { status: 500 })
      }
      var extracted = parseAIJson(singleRes.text)
      if (!extracted) {
        /* (و51) فرصة أخيرة: إعادة النداء بتأكيد صريح «JSON فقط» — بعض
           الصور/الملفات بترجّع رد الموديل مش قابل للتصليح من أول مرة */
        console.error('[AI Extract] Parse failed on first pass, retrying with reinforced prompt. Raw head:', (singleRes.text || '').substring(0, 300))
        var retryRes = await callGemini(apiKey, [
          { text: singlePrompt + '\n\nCRITICAL: Output ONLY the raw JSON object. No prose, no markdown, no comments. Start with { and end with }.' },
          qPart,
        ])
        if (retryRes.ok) {
          extracted = parseAIJson(retryRes.text)
        }
      }
      if (!extracted) {
        console.error('[AI Extract] Parse failed after retry. Raw head:', (singleRes.text || '').substring(0, 400))
        return NextResponse.json({ error: 'Could not parse AI response', raw: (singleRes.text || '').substring(0, 500) }, { status: 500 })
      }
      // If we got questions but some have empty modelAnswer (the document had
      // no answers for them) → smart answer pass: extract-or-SOLVE (2026-ز)
      var missingAnswers = (extracted.questions || []).filter(function(q: any) {
        return !(q.modelAnswer || q.answer || '').trim()
      })
      if (missingAnswers.length > 0) {
        console.log('[AI Extract] Found', missingAnswers.length, 'questions with empty modelAnswer. Running smart answer pass (extract-or-solve)...')
        var answersPrompt = buildAnswersOnlyPrompt(grade, type, extracted.questions)
        var answersParts = [{ text: answersPrompt }, qPart]
        var answersRes = await callGemini(apiKey, answersParts)
        if (answersRes.ok) {
          var answersData = parseAIJson(answersRes.text)
          if (answersData && Array.isArray(answersData.answers)) {
            // Merge answers into extracted questions
            extracted.questions = extracted.questions.map(function(q: any, i: number) {
              var ans = answersData.answers[i]
              if (ans) {
                return Object.assign({}, q, {
                  modelAnswer: q.modelAnswer || ans.modelAnswer || ans.answer || '',
                  acceptedAnswers: Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 0 ? q.acceptedAnswers : (Array.isArray(ans.acceptedAnswers) ? ans.acceptedAnswers : []),
                  correct: (q.type === 'writing' || q.type === 'essay') ? -1 : (typeof ans.correct === 'number' ? ans.correct : (typeof q.correct === 'number' ? q.correct : 0))
                })
              }
              return q
            })
          }
        }
      }
      /* (و53) مفيش قص سيرفري وقت الاستخراج — ده كان بيملا url من رندر السيرفر
         وبيمنع قص المتصفح الأعلى جودة (وهو اللي نزل جودة الرسمات بعد و50).
         الترتيب الجديد: المتصفح يقص الأول من الملف الأصلي بدقة كاملة
         (ensureFigureUrls في finishExtraction) → اللي فات /api/crop-figures
         إنقاذ سيرفري من الملف المخزن تحت. الملف بيتخزن هنا زي ما هو. */
      var figuresCrop = null
      if (cropSrc) {
        /* (و50) تخزين الملف الأصلي على السيرفر — خط الإنقاذ: أي وقت ناقص رسمة
           (حتى لو الحفظ أو بعدين) /api/crop-figures يقدر يقص منه تاني */
        try {
          var srcB64 = cropSrc.base64 || ''
          if (srcB64 && srcB64.length > 0 && srcB64.length < 6 * 1024 * 1024) {
            var srcMedia = await db.media.create({
              data: {
                filename: String(cropSrc.name || 'source').substring(0, 120),
                filePath: 'extraction-source/' + Date.now(),
                fileType: cropSrc.mime || 'application/octet-stream',
                fileSize: String(srcB64.length),
                data: srcB64,
                category: 'extraction-source',
              },
            })
            extracted.sourceMediaId = srcMedia.id
          }
        } catch (eStore: any) {
          console.error('[AI Extract] source store failed (non-fatal):', (eStore && eStore.message) || eStore)
        }
      }
      return finalizeExtracted(extracted, type, grade, false, figuresCrop)
  } catch (error) {
    console.error('AI extract error:', error)
    return NextResponse.json({ error: 'Error: ' + (error.message || 'Unknown') }, { status: 500 })
  }
}

// ============= Prompt builders =============

function buildSingleFilePrompt(grade: string, type: string): string {
  var lines = []
  lines.push('You are an expert math teacher. I will give you ONE document containing math questions AND their answers.')
  lines.push('Extract questions AND their answers from this single document.')
  lines.push('')
  lines.push('IMPORTANT: Extract ONLY the questions that actually exist in the document. Do NOT invent, create, or add any questions that are not in the document.')
  lines.push('If the document has 5 questions, extract exactly those 5. If it has 20, extract all 20.')
  lines.push('')
  lines.push('There are TWO types of questions you should extract:')
  lines.push('1. "mcq" - Multiple Choice Questions: the document shows ANSWER CHOICES under the question (A/B/C/D letters, numbered choices, boxes, or any listed options).')
  lines.push('2. "writing" - Essay/Written Questions: NO answer choices are printed under the question — the student writes the full solution themselves.')
  lines.push('DECISIVE CLASSIFICATION RULE (follow it EXACTLY): choices/options printed under the question → "mcq". NO choices printed → "writing". The VERB in the question NEVER decides the type: math questions that say "Solve", "Find x", "Calculate", "Simplify" are STILL "mcq" whenever choices are listed under them. Only classify "writing" when the document truly shows no choices at all.')
  lines.push('IMAGE-CHOICE RULE (2026-W45 — mandatory): a question whose choices are PICTURES / FIGURES / GRAPHS (not text) is STILL "mcq": return "options" as an array of empty strings with the SAME length as the number of picture-choices, and put each choice picture in "optionFigures" aligned by index. NEVER label a picture-choices question as "writing" and NEVER flatten its choices into text.')
  lines.push('')
  lines.push('For "mcq" questions:')
  lines.push('- Copy the EXACT question text from the document (translate to English if needed)')
  lines.push('- Copy the EXACT options from the document (translate to English if needed)')
  lines.push('- If the document has fewer than 4 options, add plausible wrong options')
  lines.push('- If the document has no options, create 4 options with the correct answer included')
  lines.push('- Set correct answer index (0=A, 1=B, 2=C, 3=D)')
  lines.push('- Provide a modelAnswer with the step-by-step solution')
  lines.push('')
  lines.push('For "writing" questions:')
  lines.push('- Copy the EXACT question text from the document')
  lines.push('- Set options to empty array []')
  lines.push('- Set correct to -1')
  lines.push('- Provide a modelAnswer with the COMPLETE step-by-step solution (this is the reference answer for grading)')
  lines.push('- Set acceptedAnswers to an array of acceptable final answers (e.g. ["5", "x=5", "x = 5"])')
  lines.push('')
  lines.push('Rules:')
  lines.push('- ALL output text in English')
  lines.push('- MATH FORMAT (very important — the platform renders this format as real math):')
  lines.push('  * Powers: use the ^ symbol — x^2, y^5, 2^12. The platform renders them as REAL superscripts (x\u00b2).')
  lines.push('  * Fractions: EVERY fraction must use the marker \\frac{numerator}{denominator} — the platform renders it as a REAL stacked fraction (numerator above a bar, denominator below).')
  lines.push('    Example: \\frac{2^4}{2^3} renders as 2\u2074 above 2\u00b3 with a fraction bar.')
  lines.push('    Do NOT wrap the whole numerator or denominator in parentheses: write \\frac{2^4}{2^3} NOT \\frac{(2^4)}{(2^3)}.')
  lines.push('    Parentheses are allowed ONLY when they are part of the math itself, e.g. \\frac{(a+1)(a-1)}{a-1}.')
  lines.push('    NEVER write fractions as a/b or \u00be or with \u00f7 — ALWAYS use the \\frac{numerator}{denominator} marker (also inside options and acceptedAnswers).')
  lines.push('  * Square root: \u221a (e.g. \u221a9 = 3) | Cube root: \u221b | Fourth root: \u221c')
  lines.push('  * Multiplication: \u00d7 (e.g. 2 \u00d7 3 = 6) | Division: \u00f7 | Pi: \u03c0 | Plus/minus: \u00b1')
  lines.push('  * Less/greater than: < > \u2264 \u2265 | NOT equal: \u2260 | Approximate: \u2248 | Angle: \u2220 | Degree: \u00b0 | Percent: %')
  lines.push('  * Do NOT write "squared", "cubed", "to the power of" as words.')
  lines.push('  * Do NOT use any other LaTeX: no $ signs, no \\sqrt, no \\times, no \\left, no \\right, no markdown (**, *, #). The ONLY LaTeX allowed is \\frac{numerator}{denominator}.')
  lines.push('- Do NOT add questions from outside the document')
  lines.push('- Do NOT skip any question from the document')
  lines.push('- Preserve the order of questions as they appear in the document')
  lines.push('- Match each question with its correct answer/solution')
  lines.push('')
  lines.push('')
  lines.push('WORKSHEET STRUCTURE (very important — many worksheet questions contain TABLES and GRAPHS):')
  lines.push('- For EVERY question include "sourcePage": the 1-based page number of the source document where the question appears (a single-page document → 1).')
  lines.push('- If you are told the source file label, also include "srcName": that label (e.g. "الملف الأول"). Otherwise omit srcName.')
  lines.push('- TABLES: if the question shows a table, return "table" reproducing it EXACTLY: {"headers":["x","f(x)","(x, f(x))"],"rows":[[{"t":"-2"},{"t":"","blank":true},{"t":"","blank":true}]]}.')
  lines.push('  * Printed cells → {"t":"<exact printed text>"}. Cells the STUDENT must fill → {"t":"","blank":true}.')
  lines.push('  * Do NOT blank printed cells, and do NOT fill the blank cells — the student writes inside them.')
  lines.push('  * HARD RULE (2026-و55): the table must look EXACTLY like the printed page. Any cell that is EMPTY in the source MUST be {"t":"","blank":true}. You are FORBIDDEN to solve the table or write computed values into empty cells — the answers belong ONLY in modelAnswer (e.g. "f(-1)=5, f(0)=3"). A table where every cell has a value while the printed one had empty cells is a CRITICAL error.')
  /* (و43) حاجز صارم للرسومات — كل رسمة/منحنى/شكل هندسي لازم يرجع figure/optionFigures بـ bbox — ممنوع تحويل الرسمة لوصف نصي */
  lines.push('HARD RULE — FIGURES: for EVERY question (and every MCQ option) that contains or depends on any drawing, graph, plotted curve, geometric shape, diagram, chart, or image-based table: you MUST return figure/optionFigures data: question-level "figure":{"page":<page number>,"bbox":{"x":..,"y":..,"w":..,"h":..}} and option-level "optionFigures":[{"page":<page number>,"bbox":{"x":..,"y":..,"w":..,"h":..}} or null, ...] aligned with the options array.')
  lines.push('bbox = tight rectangle around the drawing INCLUDING its axes/labels, as FRACTIONS of the WHOLE page image (each value 0..1, x/y = top-left corner, w/h = size).')
  lines.push('NEVER convert a drawing into text: do NOT describe the graph, do NOT write coordinate tables or step-by-step plotting inside question text or modelAnswer. modelAnswer = concise final results only (example: "axis of symmetry: x = 3, maximum value = 4").')
  lines.push('If unsure whether something is a figure, treat it AS a figure. Options that are pure images get empty string text plus their optionFigures entry.')
  lines.push('- modelAnswer must include the expected table values when applicable (e.g. "f(-1)=5, f(0)=3 → points (-1,5), (0,3)").')
  lines.push('')
  lines.push('SMART ANSWER RULE (very important — the teacher relies on this):')
  lines.push('* If the document CONTAINS the answer for a question → extract THAT exact answer as written in the document.')
  lines.push('* If a question has NO answer anywhere in the document → SOLVE it yourself completely: you are an expert math teacher, so produce a correct, clear, step-by-step solution that matches the grade curriculum level (Grade: ' + grade + ').')
  lines.push('* NEVER leave modelAnswer empty. EVERY question must end up with a full modelAnswer (extracted from the document OR solved by you).')
  lines.push('* For writing questions you solved yourself, also fill acceptedAnswers with the acceptable final answers.')
  lines.push('- Grade: ' + grade + ' | Type: ' + type)
  lines.push('')
  lines.push('Return ONE single valid JSON object — no text before or after, no markdown fences, no fields outside the object:')
  lines.push('{"title":"...","content":"...","questions":[{"type":"mcq","question":"...","options":["A","B","C","D"],"optionFigures":[null,null,{"page":1,"bbox":{"x":0.1,"y":0.2,"w":0.2,"h":0.15}},null],"correct":0,"points":1,"modelAnswer":"step by step solution","sourcePage":1},{"type":"writing","question":"...","options":[],"correct":-1,"points":5,"modelAnswer":"full step by step solution","acceptedAnswers":["5","x=5"],"sourcePage":1,"table":{"headers":["x","f(x)"],"rows":[[{"t":"-1"},{"t":"","blank":true}]]},"figure":{"page":1,"bbox":{"x":0.05,"y":0.3,"w":0.4,"h":0.35}}}],"answerKey":""}')
  return lines.join('\n')
}

function buildAnswersOnlyPrompt(grade: string, type: string, questions: any[]): string {
  var lines = []
  lines.push('You are an expert math teacher. I will give you ONE document containing ANSWERS / answer key for math questions.')
  lines.push('Extract the answer for EACH question. The answers should match the questions I list below.')
  lines.push('')
  lines.push('Here are the questions extracted from a separate questions document (in order):')
  questions.forEach(function(q, i) {
    /* (و45) سؤال له اختيارات (نص أو صور) = اختياري دايمًا */
    var qType = isWritingQuestion(q) ? 'writing' : 'mcq'
    if (qType === 'mcq') {
      lines.push((i + 1) + '. [MCQ] ' + (q.question || ''))
      if (Array.isArray(q.options) && q.options.length > 0) {
        lines.push('   Options: ' + q.options.map(function(o, oi) { return String.fromCharCode(65 + oi) + ') ' + o }).join(' | '))
      }
    } else {
      lines.push((i + 1) + '. [WRITING] ' + (q.question || ''))
    }
    /* (2026-و40-w) بنية ورقة العمل: سؤال فيه جدول — نعرضه للنموذج عشان يطابق
       إجابة المفتاح مع صفوفه ويكتب القيم المتوقعة في modelAnswer */
    if (q.table && Array.isArray(q.table.rows) && q.table.rows.length > 0) {
      var tHead = Array.isArray(q.table.headers) ? q.table.headers.join(' | ') : ''
      var tRows = q.table.rows.map(function(row: any) {
        if (!Array.isArray(row)) return ''
        return row.map(function(cell: any) {
          var isBlank = cell && typeof cell === 'object' && cell.blank === true
          return isBlank ? '____' : String((cell && typeof cell === 'object' ? cell.t : cell) || '')
        }).join(' | ')
      }).join(' ; ')
      lines.push('   Table: ' + (tHead ? tHead + ' :: ' : '') + tRows)
    }
  })
  lines.push('')
  lines.push('For EACH question above, find its answer in the answer-key document and return:')
  lines.push('- For MCQ: the correct option index (0=A, 1=B, 2=C, 3=D) and a step-by-step modelAnswer')
  lines.push('- For WRITING: a complete step-by-step modelAnswer AND an array of acceptedAnswers (acceptable final answers)')
  lines.push('')
  /* (2026-و40-w) ورقة العمل: جداول قابلة للكتابة + رسومات — modelAnswer لازم
     يشمل قيم الجدول المتوقعة، والرسومات ممنوع تتحول لنص */
  lines.push('WORKSHEET STRUCTURE (2026-و40-w):')
  lines.push('- Some questions have a fillable TABLE (shown above with ____ for the blank cells the student must fill). For those, the modelAnswer MUST include the expected table values row by row (e.g. "f(-1)=5, f(0)=3 → points (-1,5), (0,3)").')
  lines.push('- If a question has a figure/graph, NEVER flatten it into text and NEVER describe the drawing: modelAnswer = concise final results only (example: "axis of symmetry: x = 3, maximum value = 4"); the figure itself is kept as an image crop.')
  lines.push('')
  /* (استخراج أدق 2026-و10 — شكوى المستر: «تستخرج منه الإجابة… ما تكونش بالحر»):
     الإجابة لازم تتقرا من ورقة الإجابات حرفياً — ممنوع تخمين الحرف */
  lines.push('ACCURACY RULES (most important — the teacher complained about random answers):')
  lines.push('- READ the answer key EXACTLY as written. For MCQ the "correct" index MUST be the letter/number actually written in the key for that question (e.g. key says "12-B" → correct:1).')
  lines.push('- ALWAYS include "keyQuote": the exact text you read from the key for that question (like "12-B" or "Q5: x=7"). This proves you read it, do not invent it.')
  lines.push('- ALWAYS include "confidence": "high" when the key clearly states the answer, "low" when the key is ambiguous, unreadable, or the answer is not there.')
  lines.push('- If the answer for a question is NOT clearly found in the key → set "correct": -1 (MCQ) and confidence "low" — NEVER guess a letter. Still provide your best modelAnswer (marked as solved by you).')
  lines.push('- Watch out for common traps: shifted numbering (answer 5 belongs to question 6), columns read in the wrong order, and answer letters written next to the PREVIOUS question. Verify the question number in the key matches before assigning.')
  lines.push('- Match by the question NUMBER first; only fall back to matching by text when the key has no numbers.')
  lines.push('')
  lines.push('SMART RULE: If the answer for a question IS found in the document → extract it exactly as written in the document.')
  lines.push('If the answer is NOT found in the document → SOLVE that question yourself completely: expert math teacher, correct, clear step-by-step solution matching the grade curriculum level (Grade: ' + grade + ') — and mark confidence "low".')
  lines.push('NEVER return empty values: EVERY question must get a complete modelAnswer (extracted OR solved by you). For writing questions also fill acceptedAnswers.')
  lines.push('')
  lines.push('Rules:')
  lines.push('- ALL output text in English')
  lines.push('- MATH FORMAT (very important — the platform renders this format as real math):')
  lines.push('  * Powers: use the ^ symbol — x^2, y^5, 2^12 (rendered as REAL superscripts).')
  lines.push('  * In modelAnswer / acceptedAnswers write every fraction as \\frac{numerator}{denominator} — rendered as a REAL stacked fraction. Example: "\\frac{3}{4}". NEVER write a/b or \u00be.')
  lines.push('  * Do NOT wrap the whole numerator or denominator in parentheses: write \\frac{2^4}{2^3} NOT \\frac{(2^4)}{(2^3)}.')
  lines.push('  * Use proper Unicode symbols: \u221a \u00d7 \u00f7 \u03c0 \u2264 \u2265 \u2260 \u2248 \u2220 \u00b0. Do NOT use other LaTeX ($, \\sqrt, \\times…) or markdown.')
  lines.push('- The "answers" array MUST have the same length and order as the questions above')
  lines.push('- Each answer object MUST have an "index" field matching the question number (0-based)')
  lines.push('')
  lines.push('Return ONE single valid JSON object — no text before or after, no markdown fences, no fields outside the object:')
  lines.push('{"answers":[{"index":0,"correct":0,"confidence":"high","keyQuote":"1-A","modelAnswer":"step by step"},{"index":1,"correct":-1,"confidence":"low","keyQuote":"","modelAnswer":"full solution","acceptedAnswers":["5","x=5"]}]}')
  return lines.join('\n')
}

function finalizeExtracted(extracted: any, type: string, grade: string, twoFilesMode: boolean, figuresCrop?: any): any {
  if (!extracted.title) { extracted.title = type + ' - ' + grade }
  if (!extracted.content) { extracted.content = '' }
  if (!Array.isArray(extracted.questions)) { extracted.questions = [] }
  if (!extracted.answerKey) { extracted.answerKey = '' }

  extracted.questions = extracted.questions.map(function(q) {
    /* (و45) سؤال له اختيارات (نص أو صور/رسومات) = اختياري دايمًا — ممنوع يتحول مقالي */
    var qType = isWritingQuestion(q) ? 'writing' : 'mcq'
    /* (2026-و40-w) حقول ورقة العمل — pass-through (المصدر: البحث عن الجداول
       والرسومات في ورقة المستر): sourcePage/srcName/table/figure/optionFigures
       بتتحفظ زي ما هي جنب الحقول القانونية — مع تطبيع خفيف */
    var worksheet: any = {}
    var spN = parseInt(String(q.sourcePage), 10)
    if (isFinite(spN) && spN > 0) worksheet.sourcePage = spN
    if (q.srcName && String(q.srcName).trim()) worksheet.srcName = String(q.srcName).trim()
    if (q.table && Array.isArray(q.table.rows)) worksheet.table = q.table
    if (q.figure && q.figure.bbox) worksheet.figure = q.figure
    if (Array.isArray(q.optionFigures)) worksheet.optionFigures = q.optionFigures
    var withWs = function (obj: any) { return Object.assign({}, obj, worksheet) }
    if (qType === 'writing') {
      return withWs({
        type: 'writing',
        question: normalizeMath(q.question || ''),
        options: [],
        correct: -1,
        points: q.points || 5,
        modelAnswer: normalizeMath(q.modelAnswer || q.answer || ''),
        acceptedAnswers: (Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : []).map(function(a: any) { return normalizeMath(String(a)) })
      })
    }
    return withWs({
      type: 'mcq',
      question: normalizeMath(q.question || ''),
      /* (و45) لو الاختيارات صور من غير نص — بنملأ نص فاضي بنفس عدد رسومات الاختيارات
         عشان الفهارس تبقى متوافقة والسؤال يفضل اختياري صور مش مقالي */
      options: (function () {
        var opts = Array.isArray(q.options) ? q.options.slice() : []
        if (opts.length === 0 && Array.isArray(q.optionFigures) && q.optionFigures.length > 0) {
          for (var ofi = 0; ofi < q.optionFigures.length; ofi++) opts.push('')
        }
        if (opts.length === 0) opts = ['N/A', 'N/A', 'N/A', 'N/A']
        return opts.slice(0, 4).map(function(o: any) { return normalizeMath(String(o)) })
      })(),
      correct: typeof q.correct === 'number' ? q.correct : 0,
      points: q.points || 1,
      modelAnswer: normalizeMath(q.modelAnswer || '')
    })
  })

  var mcqCount = extracted.questions.filter(function(q) { return q.type === 'mcq' }).length
  var writingCount = extracted.questions.filter(function(q) { return q.type === 'writing' }).length
  extracted.stats = { mcq: mcqCount, writing: writingCount, total: extracted.questions.length, twoFilesMode: twoFilesMode }
  /* (و50) إحصائية القص السيرفري في الرد — الفشل ميبقاش صامت أبدًا */
  if (figuresCrop) { extracted.figuresCrop = figuresCrop }
  return NextResponse.json({ success: true, extracted: extracted })
}
