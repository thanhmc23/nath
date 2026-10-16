export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'matching_or_fill';

export type Difficulty = 'nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao';

export type VerificationStatus = 'extracted' | 'verified' | 'ai_generated' | 'needs_review';

export interface QuestionOption {
  id: string; // e.g. "A", "B", "C", "D"
  content: string;
  isCorrect?: boolean;
}

export interface TrueFalseProposition {
  id: string; // e.g. "a", "b", "c", "d"
  statement: string;
  isCorrect: boolean; // true = Đúng, false = Sai
  explanation?: string;
}

export interface Question {
  id: string;
  code: string; // Unique question code, e.g. "TOAN12-CH1-001"
  content: string;
  questionType: QuestionType;
  subjectId: string;
  subjectName: string;
  topic: string;
  chapter?: string;
  difficulty: Difficulty;
  defaultPoints: number;
  
  // Options for single_choice & multiple_choice
  options?: QuestionOption[];
  correctAnswers?: string[]; // e.g. ["A"] or ["A", "C"]
  
  // For true_false
  propositions?: TrueFalseProposition[];
  trueFalseScoringMode?: 'whole_question' | 'per_proposition';
  
  // For short_answer
  acceptedAnswers?: string[];
  numericalTolerance?: number;
  unit?: string;
  
  // For essay
  gradingRubric?: {
    criteria: string;
    points: number;
    description: string;
  }[];
  sampleAnswer?: string;
  
  // For matching_or_fill
  matchingPairs?: { left: string; right: string }[];
  blanks?: { position: number; answer: string }[];
  
  explanation?: string;
  hasFormulas?: boolean;
  hasImages?: boolean;
  imageUrl?: string;
  
  // Provenance & Quality
  sourceDocumentId?: string;
  sourceDocumentName?: string;
  sourcePage?: number;
  sourcePosition?: string;
  verificationStatus: VerificationStatus;
  confidenceScore: number; // 0 - 100
  reviewNote?: string;
  
  createdAt: string;
  updatedAt: string;
  history?: {
    timestamp: string;
    action: string;
    user: string;
    details?: string;
  }[];
}

export interface SourceDocument {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  pageCount?: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  progress: number; // 0 - 100
  isScan: boolean;
  extractedQuestionsCount: number;
  subjectId?: string;
  topicsFound: string[];
  summary?: string;
}

export interface SubjectRule {
  id: string;
  code: string;
  name: string;
  gradeLevels: string[];
  referenceCurriculum: string;
  chapters: { id: string; name: string; topics: string[] }[];
  supportedQuestionTypes: QuestionType[];
  defaultDifficultyRatio: {
    nhan_biet: number;
    thong_hieu: number;
    van_dung: number;
    van_dung_cao: number;
  };
  scoringPolicy: {
    totalPoints: number;
    rounding: number; // 0.1, 0.25, 0.5
    singleChoicePoints: number;
    multipleChoicePolicy: 'all_or_nothing' | 'partial_credit' | 'negative_penalty';
    trueFalsePolicy: 'per_proposition' | 'whole_question';
    shortAnswerNormalize: boolean;
  };
  mathFormulaSupport: boolean;
  solvingGuidelines: string;
  essayRubricCriteria: string[];
}

export interface ExamSectionConfig {
  id: string;
  title: string; // e.g. "Phần I: Trắc nghiệm 4 lựa chọn"
  questionType: QuestionType;
  questionCount: number;
  pointsPerQuestion: number;
  difficultyRatio: {
    nhan_biet: number;
    thong_hieu: number;
    van_dung: number;
    van_dung_cao: number;
  };
  topics?: string[];
  trueFalseCountMode?: 'per_question' | 'per_proposition';
}

export interface ExamTemplate {
  id: string;
  name: string;
  description: string;
  subjectId: string;
  subjectName: string;
  gradeLevel: string;
  totalQuestions: number;
  durationMinutes: number;
  totalPoints: number;
  sections: ExamSectionConfig[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowReusedQuestions: boolean;
  version: number;
  isSystem: boolean;
  createdAt: string;
}

export interface ExamVariant {
  variantCode: string; // e.g. "101", "102"
  questionIds: string[];
  shuffledQuestions: Question[];
}

export interface Exam {
  id: string;
  code: string; // e.g. "EXAM-2026-TOAN12-01"
  title: string;
  subjectId: string;
  subjectName: string;
  durationMinutes: number;
  totalPoints: number;
  templateId?: string;
  topics: string[];
  difficultyDistribution: {
    nhan_biet: number;
    thong_hieu: number;
    van_dung: number;
    van_dung_cao: number;
  };
  sections: ExamSectionConfig[];
  questions: Question[];
  variants: ExamVariant[];
  hasExplanationsInKey: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Solving State (Backend-controlled)
  solve_enabled: boolean;
  solve_status: 'none' | 'processing' | 'completed' | 'error';
  solvedSolutions?: {
    questionId: string;
    reasoning: string[];
    aiAnswer: string;
    matchesOriginalAnswer: boolean;
    confidence: number;
    ambiguityWarning?: string;
  }[];
}

export interface SubmissionAnswer {
  questionId: string;
  studentAnswer: string | string[]; // "A", ["A", "C"], or text
  propositionAnswers?: Record<string, boolean>; // for true_false e.g. { a: true, b: false }
}

export interface GradedQuestionResult {
  questionId: string;
  questionType: QuestionType;
  maxPoints: number;
  awardedPoints: number;
  isCorrect: boolean;
  isPartial: boolean;
  studentAnswer: string | string[];
  correctAnswer: string | string[];
  feedback: string;
  needsTeacherReview: boolean;
  teacherOverriddenPoints?: number;
  teacherNote?: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  variantCode: string;
  submittedAt: string;
  
  // Backend Controlled grading
  grading_enabled: boolean;
  grading_status: 'ungraded' | 'grading' | 'needs_teacher_review' | 'confirmed';
  
  answers: SubmissionAnswer[];
  totalScore: number;
  maxScore: number;
  sectionScores: Record<string, number>;
  gradedResults: GradedQuestionResult[];
  teacherConfirmedBy?: string;
  teacherConfirmedAt?: string;
}

export interface DashboardStats {
  totalDocuments: number;
  totalQuestions: number;
  questionsByType: Record<QuestionType, number>;
  questionsByDifficulty: Record<Difficulty, number>;
  verifiedQuestions: number;
  needsReviewQuestions: number;
  aiGeneratedQuestions: number;
  totalExams: number;
  totalTemplates: number;
  totalGradedSubmissions: number;
  pendingTeacherReviewSubmissions: number;
  totalSolvedExams: number;
}
