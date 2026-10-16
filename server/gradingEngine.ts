import {
  Exam,
  ExamSubmission,
  GradedQuestionResult,
  SubmissionAnswer,
  Question,
  SubjectRule
} from '../src/types/index.ts';
import { gradeEssayWithRubric } from './geminiService.ts';

/**
 * Grade an entire student submission according to the exam questions and subject rules
 */
export async function gradeSubmission(
  exam: Exam,
  submissionInput: {
    studentId: string;
    studentName: string;
    variantCode: string;
    answers: SubmissionAnswer[];
  },
  subjectRule?: SubjectRule,
  allowAiEssayGrading: boolean = false
): Promise<ExamSubmission> {
  // Find variant questions
  const variant = exam.variants.find((v) => v.variantCode === submissionInput.variantCode);
  const questionsToUse = variant ? variant.shuffledQuestions : exam.questions;

  const questionMap = new Map<string, Question>();
  for (const q of questionsToUse) {
    questionMap.set(q.id, q);
  }

  const gradedResults: GradedQuestionResult[] = [];
  let totalScore = 0;
  const sectionScores: Record<string, number> = {};
  let hasPendingTeacherReview = false;

  for (const item of submissionInput.answers) {
    const question = questionMap.get(item.questionId);
    if (!question) continue;

    const maxPoints = question.defaultPoints || 0.25;
    let awardedPoints = 0;
    let isCorrect = false;
    let isPartial = false;
    let feedback = '';
    let needsTeacherReview = false;

    switch (question.questionType) {
      case 'single_choice': {
        const studentAns = (item.studentAnswer as string || '').trim().toUpperCase();
        const correctAns = (question.correctAnswers?.[0] || '').trim().toUpperCase();
        if (studentAns && studentAns === correctAns) {
          awardedPoints = maxPoints;
          isCorrect = true;
          feedback = 'Chính xác';
        } else {
          awardedPoints = 0;
          isCorrect = false;
          feedback = studentAns ? `Sai. Đáp án đúng là ${correctAns}` : 'Chưa trả lời';
        }
        break;
      }

      case 'multiple_choice': {
        const studentChoices = Array.isArray(item.studentAnswer)
          ? item.studentAnswer.map((s) => s.trim().toUpperCase())
          : [item.studentAnswer].filter(Boolean).map((s) => s.trim().toUpperCase());
        const correctChoices = (question.correctAnswers || []).map((s) => s.trim().toUpperCase());

        const policy = subjectRule?.scoringPolicy.multipleChoicePolicy || 'all_or_nothing';

        if (policy === 'all_or_nothing') {
          const setsMatch =
            studentChoices.length === correctChoices.length &&
            studentChoices.every((c) => correctChoices.includes(c));
          if (setsMatch) {
            awardedPoints = maxPoints;
            isCorrect = true;
            feedback = 'Đúng hoàn toàn tất cả các đáp án';
          } else {
            awardedPoints = 0;
            isCorrect = false;
            feedback = `Sai. Các đáp án đúng là: ${correctChoices.join(', ')}`;
          }
        } else {
          // Partial credit
          let correctCount = 0;
          let wrongCount = 0;
          for (const c of studentChoices) {
            if (correctChoices.includes(c)) correctCount++;
            else wrongCount++;
          }
          if (wrongCount === 0 && correctCount === correctChoices.length) {
            awardedPoints = maxPoints;
            isCorrect = true;
            feedback = 'Đúng đầy đủ tất cả các đáp án';
          } else if (correctCount > 0) {
            const fraction = Math.max(0, (correctCount - wrongCount * 0.5) / correctChoices.length);
            awardedPoints = Math.round(fraction * maxPoints * 100) / 100;
            isPartial = true;
            feedback = `Đúng ${correctCount}/${correctChoices.length} ý. Trừ điểm chọn sai nếu có.`;
          } else {
            awardedPoints = 0;
            isCorrect = false;
            feedback = `Không có đáp án đúng. Đáp án chuẩn: ${correctChoices.join(', ')}`;
          }
        }
        break;
      }

      case 'true_false': {
        const studentProps = item.propositionAnswers || {};
        const correctProps = question.propositions || [];
        let matchingCount = 0;

        for (const p of correctProps) {
          const studentVal = studentProps[p.id];
          if (studentVal !== undefined && studentVal === p.isCorrect) {
            matchingCount++;
          }
        }

        const scoringMode = question.trueFalseScoringMode || 'per_proposition';
        if (scoringMode === 'per_proposition') {
          // Ministry standard: 1 ý đúng = 0.1đ, 2 ý đúng = 0.25đ, 3 ý đúng = 0.5đ, 4 ý đúng = 1.0đ
          if (matchingCount === 4) awardedPoints = maxPoints;
          else if (matchingCount === 3) awardedPoints = maxPoints * 0.5;
          else if (matchingCount === 2) awardedPoints = maxPoints * 0.25;
          else if (matchingCount === 1) awardedPoints = maxPoints * 0.1;
          else awardedPoints = 0;

          isCorrect = matchingCount === correctProps.length;
          isPartial = matchingCount > 0 && matchingCount < correctProps.length;
          feedback = `Đúng ${matchingCount}/${correctProps.length} mệnh đề.`;
        } else {
          // Whole question
          if (matchingCount === correctProps.length) {
            awardedPoints = maxPoints;
            isCorrect = true;
            feedback = 'Đúng tất cả mệnh đề';
          } else {
            awardedPoints = 0;
            isCorrect = false;
            feedback = `Đúng ${matchingCount}/${correctProps.length} mệnh đề (Chế độ chấm cả câu lớn)`;
          }
        }
        break;
      }

      case 'short_answer': {
        const studentText = (typeof item.studentAnswer === 'string' ? item.studentAnswer : '')
          .trim()
          .toLowerCase();
        const accepted = (question.acceptedAnswers || []).map((a) => a.trim().toLowerCase());
        
        let matched = false;
        if (accepted.includes(studentText)) {
          matched = true;
        } else {
          // Try parsing numeric tolerance
          const studentNum = parseFloat(studentText.replace(',', '.'));
          if (!isNaN(studentNum) && question.numericalTolerance !== undefined) {
            for (const acc of accepted) {
              const accNum = parseFloat(acc.replace(',', '.'));
              if (!isNaN(accNum) && Math.abs(studentNum - accNum) <= question.numericalTolerance) {
                matched = true;
                break;
              }
            }
          }
        }

        if (matched) {
          awardedPoints = maxPoints;
          isCorrect = true;
          feedback = 'Chính xác';
        } else {
          awardedPoints = 0;
          isCorrect = false;
          feedback = `Chưa đúng. Đáp án chuẩn: ${question.acceptedAnswers?.join(' hoặc ')}`;
        }
        break;
      }

      case 'essay': {
        const studentEssayText = typeof item.studentAnswer === 'string' ? item.studentAnswer : '';
        if (!studentEssayText.trim()) {
          awardedPoints = 0;
          feedback = 'Thí sinh bỏ trống câu tự luận.';
          needsTeacherReview = false;
        } else if (allowAiEssayGrading) {
          try {
            const aiGrading = await gradeEssayWithRubric({
              questionContent: question.content,
              sampleAnswer: question.sampleAnswer,
              gradingRubric: question.gradingRubric,
              studentEssay: studentEssayText,
              maxPoints
            });
            awardedPoints = aiGrading.awardedPoints;
            feedback = `[AI Gợi ý]: ${aiGrading.feedback}`;
            needsTeacherReview = true;
            hasPendingTeacherReview = true;
          } catch (err: any) {
            awardedPoints = 0;
            feedback = 'Cần giáo viên chấm thủ công (Lỗi chấm tự động: ' + err.message + ')';
            needsTeacherReview = true;
            hasPendingTeacherReview = true;
          }
        } else {
          // Teacher manual review required
          awardedPoints = 0;
          feedback = 'Bài tự luận đã nộp. Đang chờ giáo viên chấm và xác nhận điểm.';
          needsTeacherReview = true;
          hasPendingTeacherReview = true;
        }
        break;
      }

      default:
        awardedPoints = 0;
        feedback = 'Dạng câu hỏi chưa được cấu hình chấm tự động.';
    }

    totalScore += awardedPoints;
    const secKey = question.topic || 'Chung';
    sectionScores[secKey] = (sectionScores[secKey] || 0) + awardedPoints;

    gradedResults.push({
      questionId: question.id,
      questionType: question.questionType,
      maxPoints,
      awardedPoints,
      isCorrect,
      isPartial,
      studentAnswer: item.studentAnswer,
      correctAnswer: question.correctAnswers || question.acceptedAnswers || [],
      feedback,
      needsTeacherReview
    });
  }

  // Rounding total score
  const rounding = subjectRule?.scoringPolicy.rounding || 0.25;
  const roundedTotalScore = Math.round(totalScore / rounding) * rounding;

  const submission: ExamSubmission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    examId: exam.id,
    examTitle: exam.title,
    studentId: submissionInput.studentId || 'TS-' + Math.floor(1000 + Math.random() * 9000),
    studentName: submissionInput.studentName || 'Thí sinh tự do',
    variantCode: submissionInput.variantCode || '101',
    submittedAt: new Date().toISOString(),
    grading_enabled: true,
    grading_status: hasPendingTeacherReview ? 'needs_teacher_review' : 'confirmed',
    answers: submissionInput.answers,
    totalScore: Math.round(roundedTotalScore * 100) / 100,
    maxScore: exam.totalPoints,
    sectionScores,
    gradedResults
  };

  return submission;
}
