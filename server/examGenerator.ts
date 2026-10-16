import {
  Question,
  Exam,
  ExamVariant,
  ExamSectionConfig,
  QuestionType,
  Difficulty
} from '../src/types/index.ts';

export interface ExamGenerationRequest {
  title: string;
  subjectId: string;
  subjectName: string;
  durationMinutes: number;
  totalPoints: number;
  templateId?: string;
  topics?: string[];
  allowReusedQuestions?: boolean;
  hasExplanationsInKey?: boolean;
  sections: ExamSectionConfig[];
  variantCount?: number; // e.g. 2 or 4 variants (101, 102, 103, 104)
  priorityVerifiedOnly?: boolean;
}

export interface FeasibilityReport {
  isFeasible: boolean;
  totalRequired: number;
  totalAvailable: number;
  missingByType: Record<string, { required: number; available: number; missing: number }>;
  missingByDifficulty: Record<string, { required: number; available: number; missing: number }>;
  warnings: string[];
}

/**
 * Check feasibility of generating an exam against the question pool
 */
export function checkExamFeasibility(
  request: ExamGenerationRequest,
  availableQuestions: Question[]
): FeasibilityReport {
  const missingByType: Record<string, { required: number; available: number; missing: number }> = {};
  const missingByDifficulty: Record<string, { required: number; available: number; missing: number }> = {};
  const warnings: string[] = [];

  // Filter pool by subject and optionally topics
  let pool = availableQuestions.filter((q) => q.subjectId === request.subjectId);
  if (request.topics && request.topics.length > 0) {
    pool = pool.filter((q) => request.topics!.includes(q.topic));
  }

  if (request.priorityVerifiedOnly) {
    const verifiedPool = pool.filter((q) => q.verificationStatus === 'verified');
    if (verifiedPool.length < pool.length) {
      warnings.push(`Chỉ sử dụng câu hỏi đã xác minh (${verifiedPool.length}/${pool.length} câu trong kho).`);
      pool = verifiedPool;
    }
  }

  let totalRequired = 0;
  let isFeasible = true;

  for (const section of request.sections) {
    const qType = section.questionType;
    let requiredCount = section.questionCount;
    if (qType === 'true_false' && section.trueFalseCountMode === 'per_proposition') {
      // 1 big question has typically 4 propositions
      requiredCount = Math.ceil(section.questionCount / 4);
    }
    totalRequired += requiredCount;

    const availableForType = pool.filter((q) => q.questionType === qType).length;
    const diff = requiredCount - availableForType;

    missingByType[qType] = {
      required: requiredCount,
      available: availableForType,
      missing: Math.max(0, diff)
    };

    if (diff > 0) {
      isFeasible = false;
      warnings.push(
        `Dạng "${getQuestionTypeName(qType)}" cần ${requiredCount} câu, hiện chỉ có ${availableForType} câu (thiếu ${diff} câu).`
      );
    }
  }

  return {
    isFeasible,
    totalRequired,
    totalAvailable: pool.length,
    missingByType,
    missingByDifficulty,
    warnings
  };
}

/**
 * Generate a new Exam and its variants according to the structure
 */
export function generateExam(
  request: ExamGenerationRequest,
  availableQuestions: Question[],
  previousExamQuestionIds: Set<string> = new Set()
): { exam: Exam } {
  // Validate feasibility first
  const feasibility = checkExamFeasibility(request, availableQuestions);
  if (!feasibility.isFeasible) {
    throw new Error(
      `Ngân hàng câu hỏi không đủ số lượng yêu cầu:\n${feasibility.warnings.join('\n')}`
    );
  }

  let pool = availableQuestions.filter((q) => q.subjectId === request.subjectId);
  if (request.topics && request.topics.length > 0) {
    pool = pool.filter((q) => request.topics!.includes(q.topic));
  }

  // Filter out previously used questions if requested
  if (!request.allowReusedQuestions && previousExamQuestionIds.size > 0) {
    const freshPool = pool.filter((q) => !previousExamQuestionIds.has(q.id));
    // If fresh pool is sufficient, use it; otherwise warn and keep best
    if (freshPool.length >= feasibility.totalRequired) {
      pool = freshPool;
    }
  }

  const selectedQuestions: Question[] = [];
  const chosenIds = new Set<string>();

  for (const section of request.sections) {
    const qType = section.questionType;
    let countNeeded = section.questionCount;
    if (qType === 'true_false' && section.trueFalseCountMode === 'per_proposition') {
      countNeeded = Math.ceil(section.questionCount / 4);
    }

    // Filter available for this section
    const candidates = pool.filter((q) => q.questionType === qType && !chosenIds.has(q.id));

    // Sort by verified first, then highest confidence
    candidates.sort((a, b) => {
      if (a.verificationStatus === 'verified' && b.verificationStatus !== 'verified') return -1;
      if (b.verificationStatus === 'verified' && a.verificationStatus !== 'verified') return 1;
      return (b.confidenceScore || 0) - (a.confidenceScore || 0);
    });

    // Difficulty distribution target
    const diffTarget: Record<Difficulty, number> = {
      nhan_biet: Math.round((section.difficultyRatio.nhan_biet / 100) * countNeeded),
      thong_hieu: Math.round((section.difficultyRatio.thong_hieu / 100) * countNeeded),
      van_dung: Math.round((section.difficultyRatio.van_dung / 100) * countNeeded),
      van_dung_cao: Math.round((section.difficultyRatio.van_dung_cao / 100) * countNeeded)
    };

    const sectionPicked: Question[] = [];

    // First pass: pick matching difficulty
    for (const diff of ['nhan_biet', 'thong_hieu', 'van_dung', 'van_dung_cao'] as Difficulty[]) {
      const needed = diffTarget[diff];
      const matchDiff = candidates.filter((q) => q.difficulty === diff && !chosenIds.has(q.id));
      const picked = matchDiff.slice(0, needed);
      for (const p of picked) {
        sectionPicked.push(p);
        chosenIds.add(p.id);
      }
    }

    // Second pass: fill remainder if difficulty rounding or exact counts were short
    if (sectionPicked.length < countNeeded) {
      const remainingCandidates = candidates.filter((q) => !chosenIds.has(q.id));
      const fill = remainingCandidates.slice(0, countNeeded - sectionPicked.length);
      for (const f of fill) {
        sectionPicked.push(f);
        chosenIds.add(f.id);
      }
    }

    selectedQuestions.push(...sectionPicked);
  }

  // Create Exam Variants (e.g., 101, 102, 103, 104) with smart shuffling
  const variantCount = Math.max(1, request.variantCount || 4);
  const variants: ExamVariant[] = [];
  const baseVariantCodes = ['101', '102', '103', '104', '105', '106'];

  for (let v = 0; v < variantCount; v++) {
    const code = baseVariantCodes[v] || `MD-${100 + v + 1}`;
    
    // In variant 0, keep standard order
    // In other variants, shuffle questions within sections and shuffle options without losing correctness!
    let variantQuestions: Question[] = [];

    if (v === 0) {
      variantQuestions = JSON.parse(JSON.stringify(selectedQuestions));
    } else {
      // Group by section order and shuffle within section
      let cursor = 0;
      for (const sec of request.sections) {
        let secCount = sec.questionCount;
        if (sec.questionType === 'true_false' && sec.trueFalseCountMode === 'per_proposition') {
          secCount = Math.ceil(sec.questionCount / 4);
        }
        const secSlice = selectedQuestions.slice(cursor, cursor + secCount);
        cursor += secCount;

        // Shuffle questions in this section
        const shuffledSlice = shuffleArray([...secSlice]);

        // Deep clone & optionally shuffle options A, B, C, D
        const questionsWithShuffledOptions = shuffledSlice.map((q) => {
          const clone: Question = JSON.parse(JSON.stringify(q));
          if (
            (clone.questionType === 'single_choice' || clone.questionType === 'multiple_choice') &&
            clone.options &&
            clone.options.length > 1
          ) {
            // Find which content is correct
            const originalCorrectContents = new Set(
              clone.options.filter((o) => o.isCorrect).map((o) => o.content)
            );

            // Shuffle the options contents
            const shuffledOptionContents = shuffleArray(clone.options.map((o) => o.content));
            const newOptionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

            clone.options = shuffledOptionContents.map((content, idx) => {
              const id = newOptionLabels[idx] || `${idx + 1}`;
              const isCorrect = originalCorrectContents.has(content);
              return { id, content, isCorrect };
            });

            // Update correctAnswers list
            clone.correctAnswers = clone.options.filter((o) => o.isCorrect).map((o) => o.id);
          }
          return clone;
        });

        variantQuestions.push(...questionsWithShuffledOptions);
      }
    }

    variants.push({
      variantCode: code,
      questionIds: variantQuestions.map((q) => q.id),
      shuffledQuestions: variantQuestions
    });
  }

  // Calculate difficulty distribution of final selected set
  const diffCount: Record<Difficulty, number> = {
    nhan_biet: 0,
    thong_hieu: 0,
    van_dung: 0,
    van_dung_cao: 0
  };
  for (const q of selectedQuestions) {
    diffCount[q.difficulty]++;
  }
  const totalQ = selectedQuestions.length || 1;
  const difficultyDistribution = {
    nhan_biet: Math.round((diffCount.nhan_biet / totalQ) * 100),
    thong_hieu: Math.round((diffCount.thong_hieu / totalQ) * 100),
    van_dung: Math.round((diffCount.van_dung / totalQ) * 100),
    van_dung_cao: Math.round((diffCount.van_dung_cao / totalQ) * 100)
  };

  const exam: Exam = {
    id: `exam-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    code: `DE-${Date.now().toString().slice(-6)}`,
    title: request.title,
    subjectId: request.subjectId,
    subjectName: request.subjectName,
    durationMinutes: request.durationMinutes,
    totalPoints: request.totalPoints,
    templateId: request.templateId,
    topics: request.topics || [],
    difficultyDistribution,
    sections: request.sections,
    questions: selectedQuestions,
    variants,
    hasExplanationsInKey: request.hasExplanationsInKey ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    solve_enabled: false,
    solve_status: 'none'
  };

  return { exam };
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getQuestionTypeName(type: QuestionType): string {
  switch (type) {
    case 'single_choice':
      return 'Trắc nghiệm một đáp án đúng';
    case 'multiple_choice':
      return 'Trắc nghiệm nhiều đáp án đúng';
    case 'true_false':
      return 'Trắc nghiệm Đúng / Sai';
    case 'short_answer':
      return 'Trả lời ngắn';
    case 'essay':
      return 'Tự luận';
    case 'matching_or_fill':
      return 'Ghép nối / Điền khuyết';
    default:
      return type;
  }
}
