import { GoogleGenAI, Type } from '@google/genai';
import { Question, QuestionType, Difficulty } from '../src/types/index.ts';

// Shared Gemini client with telemetry User-Agent as instructed by gemini-api skill
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ExtractionResult {
  questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[];
  detectedSubject?: string;
  detectedTopics: string[];
  summary: string;
}

/**
 * Extract questions from document text, PDF, or image using Gemini 3.8 Flash
 */
export async function extractQuestionsFromDocument(
  input: {
    text?: string;
    mimeType?: string;
    base64Data?: string;
    fileName: string;
    subjectHint?: string;
  }
): Promise<ExtractionResult> {
  const systemInstruction = `Bạn là chuyên gia phân tích đề thi và số hóa ngân hàng câu hỏi chuyên nghiệp của Bộ Giáo dục & Đào tạo Việt Nam.
Nhiệm vụ của bạn:
1. Đọc kỹ văn bản hoặc tài liệu được cung cấp (kể cả ảnh scan OCR, bảng biểu, công thức toán học LaTeX, hóa học, tiếng Anh).
2. Tách chính xác từng câu hỏi, xác định đúng ranh giới của câu hỏi (kể cả câu dài qua nhiều trang).
3. Nhận diện dạng câu hỏi:
   - 'single_choice': Trắc nghiệm 1 lựa chọn đúng (A, B, C, D)
   - 'multiple_choice': Trắc nghiệm nhiều lựa chọn đúng
   - 'true_false': Trắc nghiệm Đúng/Sai (câu gồm các ý a, b, c, d cần đánh giá Đúng hoặc Sai)
   - 'short_answer': Trả lời ngắn (điền số, kết quả, đơn vị)
   - 'essay': Tự luận (trình bày, chứng minh, bài văn)
   - 'matching_or_fill': Ghép nối hoặc điền khuyết
4. BẢO TỒN NGUYÊN BẢN:
   - Giữ nguyên công thức toán học dưới dạng chuẩn LaTeX (ví dụ: $x^2 - 3x + 2 = 0$, $\\frac{a}{b}$, $\\int_0^1 f(x)dx$).
   - Giữ nguyên ký hiệu hóa học, vật lý, đơn vị.
   - TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT đáp án nếu tài liệu không ghi. Nếu tài liệu không có đáp án, hãy để mảng correctAnswers rỗng [] và ghi rõ trong reviewNote.
   - Đánh dấu trạng thái 'extracted' cho tất cả câu hỏi được trích xuất.
5. Phân loại mức độ khó: 'nhan_biet', 'thong_hieu', 'van_dung', 'van_dung_cao'.
6. Trả về kết quả JSON theo đúng schema.`;

  const contents: any[] = [];

  if (input.base64Data && input.mimeType) {
    contents.push({
      inlineData: {
        data: input.base64Data,
        mimeType: input.mimeType,
      },
    });
  }

  let promptText = `Hãy phân tích tài liệu đề thi "${input.fileName}" và trích xuất danh sách tất cả các câu hỏi.\n`;
  if (input.subjectHint) {
    promptText += `Gợi ý môn học: ${input.subjectHint}\n`;
  }
  if (input.text) {
    promptText += `\nNỘI DUNG TÀI LIỆU:\n${input.text.slice(0, 100000)}\n`;
  }

  contents.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: contents.length === 1 ? contents[0].text : { parts: contents },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectedSubject: { type: Type.STRING, description: 'Tên môn học phát hiện được' },
          detectedTopics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Danh sách các chủ đề hoặc chương phát hiện được'
          },
          summary: { type: Type.STRING, description: 'Tóm tắt tổng quan về tài liệu và số lượng câu hỏi' },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                code: { type: Type.STRING, description: 'Mã định danh câu hỏi nếu có hoặc mã tạo theo môn' },
                content: { type: Type.STRING, description: 'Nội dung câu hỏi đầy đủ, công thức toán viết LaTeX $...$' },
                questionType: {
                  type: Type.STRING,
                  description: 'single_choice | multiple_choice | true_false | short_answer | essay | matching_or_fill'
                },
                topic: { type: Type.STRING, description: 'Chủ đề của câu hỏi' },
                chapter: { type: Type.STRING, description: 'Chương của câu hỏi' },
                difficulty: {
                  type: Type.STRING,
                  description: 'nhan_biet | thong_hieu | van_dung | van_dung_cao'
                },
                defaultPoints: { type: Type.NUMBER, description: 'Điểm số mặc định' },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING, description: 'A, B, C, D...' },
                      content: { type: Type.STRING, description: 'Nội dung phương án' },
                      isCorrect: { type: Type.BOOLEAN }
                    },
                    required: ['id', 'content']
                  }
                },
                correctAnswers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Danh sách đáp án đúng (A, B, C...) hoặc để trống nếu tài liệu không có'
                },
                propositions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING, description: 'a, b, c, d' },
                      statement: { type: Type.STRING, description: 'Mệnh đề' },
                      isCorrect: { type: Type.BOOLEAN, description: 'Đúng hay Sai' },
                      explanation: { type: Type.STRING }
                    },
                    required: ['id', 'statement', 'isCorrect']
                  }
                },
                acceptedAnswers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Các đáp án được chấp nhận cho câu trả lời ngắn'
                },
                numericalTolerance: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                explanation: { type: Type.STRING, description: 'Lời giải hoặc giải thích nếu tài liệu có' },
                sourcePosition: { type: Type.STRING, description: 'Vị trí trong tài liệu (Câu số, phần)' },
                confidenceScore: { type: Type.NUMBER, description: 'Độ tin cậy trích xuất 0-100' },
                reviewNote: { type: Type.STRING, description: 'Ghi chú nếu câu hỏi OCR mờ, thiếu dữ kiện hoặc thiếu đáp án' }
              },
              required: ['content', 'questionType', 'difficulty']
            }
          }
        },
        required: ['questions', 'summary']
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  const questions = (parsed.questions || []).map((q: any, idx: number) => {
    const qType: QuestionType = [
      'single_choice',
      'multiple_choice',
      'true_false',
      'short_answer',
      'essay',
      'matching_or_fill'
    ].includes(q.questionType)
      ? q.questionType
      : 'single_choice';

    const diff: Difficulty = [
      'nhan_biet',
      'thong_hieu',
      'van_dung',
      'van_dung_cao'
    ].includes(q.difficulty)
      ? q.difficulty
      : 'thong_hieu';

    const hasCorrectAns = (q.correctAnswers && q.correctAnswers.length > 0) || (q.propositions && q.propositions.length > 0) || (q.acceptedAnswers && q.acceptedAnswers.length > 0);

    return {
      code: q.code || `EXT-${Date.now().toString().slice(-4)}-${idx + 1}`,
      content: q.content || '',
      questionType: qType,
      subjectId: 'sub-toan', // will be linked by caller
      subjectName: parsed.detectedSubject || 'Môn học chung',
      topic: q.topic || 'Chủ đề chung',
      chapter: q.chapter || 'Chương 1',
      difficulty: diff,
      defaultPoints: q.defaultPoints || (qType === 'true_false' ? 1.0 : qType === 'essay' ? 2.0 : 0.25),
      options: q.options || [],
      correctAnswers: q.correctAnswers || [],
      propositions: q.propositions || [],
      acceptedAnswers: q.acceptedAnswers || [],
      numericalTolerance: q.numericalTolerance,
      unit: q.unit || '',
      explanation: q.explanation || '',
      hasFormulas: (q.content && q.content.includes('$')) || false,
      hasImages: false,
      sourceDocumentName: input.fileName,
      sourcePosition: q.sourcePosition || `Câu ${idx + 1}`,
      verificationStatus: hasCorrectAns ? ('extracted' as const) : ('needs_review' as const),
      confidenceScore: q.confidenceScore || (hasCorrectAns ? 95 : 75),
      reviewNote: q.reviewNote || (!hasCorrectAns ? 'Tài liệu nguồn chưa cung cấp đáp án chính thức.' : undefined)
    };
  });

  return {
    questions,
    detectedSubject: parsed.detectedSubject,
    detectedTopics: parsed.detectedTopics || [],
    summary: parsed.summary || `Đã trích xuất ${questions.length} câu hỏi thành công.`
  };
}

/**
 * Solve Exam questions using AI (Strictly Opt-in)
 */
export async function solveExamQuestions(params: {
  subjectName: string;
  solvingGuidelines?: string;
  questions: Question[];
  solveScope: 'all' | 'selected';
  selectedQuestionIds?: string[];
  detailLevel: 'answers_only' | 'step_by_step';
}): Promise<{
  solutions: {
    questionId: string;
    reasoning: string[];
    aiAnswer: string;
    matchesOriginalAnswer: boolean;
    confidence: number;
    ambiguityWarning?: string;
  }[];
}> {
  const targetQuestions =
    params.solveScope === 'selected' && params.selectedQuestionIds
      ? params.questions.filter((q) => params.selectedQuestionIds!.includes(q.id))
      : params.questions;

  const prompt = `Bạn là chuyên gia giải đề thi môn ${params.subjectName}.
Quy tắc giải môn học:
${params.solvingGuidelines || 'Trình bày rõ ràng, bảo toàn công thức toán học LaTeX, các bước suy luận logic.'}

Mức độ chi tiết yêu cầu: ${params.detailLevel === 'step_by_step' ? 'Giải chi tiết từng bước (step by step)' : 'Đưa ra đáp án ngắn gọn và kết luận'}.

Hãy giải danh sách câu hỏi sau đây. Đối với mỗi câu hỏi:
1. Nhận diện dạng bài và dữ kiện.
2. Trình bày các bước suy luận / lập luận (mảng reasoning).
3. Đưa ra đáp án cuối cùng (aiAnswer) dưới dạng chuẩn (ví dụ "A", "2.5", "a: Đúng, b: Sai...").
4. So sánh với đáp án gốc trong đề nếu có (matchesOriginalAnswer).
5. Đánh giá độ tin cậy và cảnh báo nếu đề bị thiếu dữ kiện hoặc có nhiều cách hiểu.

Danh sách câu hỏi cần giải:
${JSON.stringify(
  targetQuestions.map((q) => ({
    id: q.id,
    content: q.content,
    questionType: q.questionType,
    options: q.options,
    propositions: q.propositions,
    originalCorrectAnswers: q.correctAnswers,
    originalAcceptedAnswers: q.acceptedAnswers
  })),
  null,
  2
)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          solutions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionId: { type: Type.STRING },
                reasoning: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Các bước lập luận, tính toán chi tiết'
                },
                aiAnswer: { type: Type.STRING, description: 'Đáp án cuối cùng do AI suy luận' },
                matchesOriginalAnswer: { type: Type.BOOLEAN, description: 'Có trùng khớp với đáp án gốc không' },
                confidence: { type: Type.NUMBER, description: 'Độ tin cậy từ 0 đến 100' },
                ambiguityWarning: { type: Type.STRING, description: 'Cảnh báo nếu đề bài mơ hồ hoặc thiếu giả thiết' }
              },
              required: ['questionId', 'reasoning', 'aiAnswer', 'matchesOriginalAnswer', 'confidence']
            }
          }
        },
        required: ['solutions']
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  return { solutions: parsed.solutions || [] };
}

/**
 * AI Essay Grading with Rubric (Strictly Opt-in)
 */
export async function gradeEssayWithRubric(params: {
  questionContent: string;
  sampleAnswer?: string;
  gradingRubric?: { criteria: string; points: number; description: string }[];
  studentEssay: string;
  maxPoints: number;
}): Promise<{
  awardedPoints: number;
  feedback: string;
  criteriaScores: { criteria: string; points: number; maxPoints: number; comment: string }[];
  needsTeacherReview: boolean;
}> {
  const prompt = `Bạn là giám khảo chấm thi tự luận chuyên nghiệp và khách quan.
Đề bài:
"${params.questionContent}"

Đáp án mẫu tham chiếu:
"${params.sampleAnswer || 'Không có đáp án mẫu, hãy đánh giá theo kiến thức học thuật chuẩn.'}"

Thang tiêu chí chấm điểm (Rubric):
${JSON.stringify(params.gradingRubric || [{ criteria: 'Đúng nội dung và phương pháp', points: params.maxPoints, description: 'Đầy đủ các ý chính' }], null, 2)}

Tổng điểm tối đa: ${params.maxPoints}

Bài làm của thí sinh:
"""
${params.studentEssay}
"""

Yêu cầu:
- Đánh giá bài làm dựa trên từng tiêu chí trong Rubric.
- Đưa ra nhận xét chi tiết, chỉ ra điểm đạt và điểm cần bổ sung.
- Tính tổng điểm.
- Luôn đánh dấu needsTeacherReview = true vì điểm AI chỉ là đề xuất tham khảo, cần giáo viên xác nhận.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          awardedPoints: { type: Type.NUMBER, description: 'Tổng điểm chấm' },
          feedback: { type: Type.STRING, description: 'Nhận xét tổng thể' },
          criteriaScores: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                criteria: { type: Type.STRING },
                points: { type: Type.NUMBER },
                maxPoints: { type: Type.NUMBER },
                comment: { type: Type.STRING }
              },
              required: ['criteria', 'points', 'maxPoints', 'comment']
            }
          },
          needsTeacherReview: { type: Type.BOOLEAN }
        },
        required: ['awardedPoints', 'feedback', 'criteriaScores', 'needsTeacherReview']
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  return {
    awardedPoints: Math.min(params.maxPoints, Math.max(0, parsed.awardedPoints || 0)),
    feedback: parsed.feedback || 'Đã hoàn thành chấm tự luận theo rubric.',
    criteriaScores: parsed.criteriaScores || [],
    needsTeacherReview: true
  };
}
