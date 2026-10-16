import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db.ts';
import {
  extractQuestionsFromDocument,
  solveExamQuestions,
  gradeEssayWithRubric
} from './server/geminiService.ts';
import { checkExamFeasibility, generateExam } from './server/examGenerator.ts';
import { gradeSubmission } from './server/gradingEngine.ts';
import {
  generateExamDocx,
  generateExamAnswersExcel,
  generateQuestionBankExcel
} from './server/exportService.ts';
import { Question, SourceDocument } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// ==========================================
// API ROUTES
// ==========================================

// Dashboard Stats
app.get('/api/dashboard/stats', (_req: Request, res: Response) => {
  try {
    const stats = db.getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Logs
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  res.json(db.getAuditLogs());
});

// ------------------------------------------
// Documents & Upload Analysis
// ------------------------------------------
app.get('/api/documents', (_req: Request, res: Response) => {
  res.json(db.getDocuments());
});

app.post('/api/documents/upload-and-analyze', async (req: Request, res: Response) => {
  try {
    const {
      fileName,
      fileSize,
      fileType,
      text,
      base64Data,
      mimeType,
      isScan,
      subjectHint
    } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'Thiếu tên tài liệu (fileName)' });
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newDoc: SourceDocument = {
      id: docId,
      fileName,
      fileSize: fileSize || 0,
      fileType: fileType || mimeType || 'text/plain',
      uploadedAt: new Date().toISOString(),
      status: 'processing',
      progress: 30,
      isScan: !!isScan,
      extractedQuestionsCount: 0,
      topicsFound: []
    };

    db.addDocument(newDoc);
    db.logAudit('TẢI_LÊN_TÀI_LIỆU', 'Người dùng', `Tải lên tài liệu: ${fileName}`);

    // Perform analysis via Gemini 3.8 Flash
    try {
      const result = await extractQuestionsFromDocument({
        text,
        base64Data,
        mimeType: mimeType || fileType,
        fileName,
        subjectHint
      });

      // Link extracted questions to document
      const fullQuestions: Question[] = result.questions.map((q, idx) => ({
        ...q,
        id: `q-${Date.now()}-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
        sourceDocumentId: docId,
        sourceDocumentName: fileName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [
          {
            timestamp: new Date().toISOString(),
            action: 'TRÍCH_XUẤT_TỪ_TÀI_LIỆU',
            user: 'Hệ thống AI',
            details: `Trích xuất từ ${fileName}`
          }
        ]
      }));

      // Find matching subject ID if possible
      const subjects = db.getSubjectRules();
      let matchedSubject = subjects.find(
        (s) => s.name.toLowerCase() === (result.detectedSubject || '').toLowerCase()
      );
      if (!matchedSubject && subjectHint) {
        matchedSubject = subjects.find(
          (s) => s.id === subjectHint || s.name.toLowerCase().includes(subjectHint.toLowerCase())
        );
      }
      if (matchedSubject) {
        fullQuestions.forEach((q) => {
          q.subjectId = matchedSubject!.id;
          q.subjectName = matchedSubject!.name;
        });
      }

      // Save questions to bank
      db.addQuestions(fullQuestions);

      // Update document status
      const updatedDoc = db.updateDocument(docId, {
        status: 'completed',
        progress: 100,
        extractedQuestionsCount: fullQuestions.length,
        topicsFound: result.detectedTopics,
        summary: result.summary,
        subjectId: matchedSubject?.id
      });

      db.logAudit(
        'PHÂN_TÍCH_HOÀN_TẤT',
        'Hệ thống AI',
        `Trích xuất thành công ${fullQuestions.length} câu hỏi từ ${fileName}`
      );

      return res.json({
        document: updatedDoc,
        extractedCount: fullQuestions.length,
        questions: fullQuestions,
        summary: result.summary
      });
    } catch (analysisErr: any) {
      console.error('Error in extraction analysis:', analysisErr);
      db.updateDocument(docId, {
        status: 'error',
        errorMessage: analysisErr.message || 'Lỗi khi phân tích tài liệu bằng AI',
        progress: 0
      });
      return res.status(500).json({
        error: `Không thể phân tích tài liệu: ${analysisErr.message}`
      });
    }
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/documents/:id', (req: Request, res: Response) => {
  const success = db.deleteDocument(req.params.id);
  if (success) {
    db.logAudit('XÓA_TÀI_LIỆU', 'Người dùng', `Đã xóa tài liệu ID: ${req.params.id}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Không tìm thấy tài liệu' });
  }
});

// ------------------------------------------
// Questions Management (Ngân hàng câu hỏi)
// ------------------------------------------
app.get('/api/questions', (req: Request, res: Response) => {
  let questions = db.getQuestions();

  const { search, subjectId, topic, questionType, difficulty, verificationStatus } = req.query;

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    questions = questions.filter(
      (item) =>
        item.content.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.explanation && item.explanation.toLowerCase().includes(q))
    );
  }

  if (subjectId && typeof subjectId === 'string') {
    questions = questions.filter((item) => item.subjectId === subjectId);
  }

  if (topic && typeof topic === 'string') {
    questions = questions.filter((item) => item.topic === topic);
  }

  if (questionType && typeof questionType === 'string') {
    questions = questions.filter((item) => item.questionType === questionType);
  }

  if (difficulty && typeof difficulty === 'string') {
    questions = questions.filter((item) => item.difficulty === difficulty);
  }

  if (verificationStatus && typeof verificationStatus === 'string') {
    questions = questions.filter((item) => item.verificationStatus === verificationStatus);
  }

  res.json(questions);
});

app.post('/api/questions', (req: Request, res: Response) => {
  try {
    const qData = req.body;
    const newQuestion: Question = {
      ...qData,
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      code: qData.code || `Q-${Date.now().toString().slice(-5)}`,
      verificationStatus: qData.verificationStatus || 'verified',
      confidenceScore: qData.confidenceScore || 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'TẠO_MỚI',
          user: 'Giáo viên',
          details: 'Thêm thủ công vào ngân hàng câu hỏi'
        }
      ]
    };

    db.addQuestions([newQuestion]);
    db.logAudit('THÊM_CÂU_HỎI', 'Người dùng', `Thêm câu hỏi mã ${newQuestion.code}`);
    res.json(newQuestion);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/questions/:id', (req: Request, res: Response) => {
  const updated = db.updateQuestion(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
  }
  db.logAudit('SỬA_CÂU_HỎI', 'Người dùng', `Cập nhật câu hỏi mã ${updated.code}`);
  res.json(updated);
});

app.delete('/api/questions/:id', (req: Request, res: Response) => {
  const success = db.deleteQuestion(req.params.id);
  if (success) {
    db.logAudit('XÓA_CÂU_HỎI', 'Người dùng', `Đã xóa câu hỏi ID: ${req.params.id}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
  }
});

app.post('/api/questions/batch-verify', (req: Request, res: Response) => {
  const { questionIds } = req.body;
  if (!Array.isArray(questionIds)) {
    return res.status(400).json({ error: 'questionIds phải là một danh sách' });
  }

  let count = 0;
  for (const id of questionIds) {
    const updated = db.updateQuestion(id, {
      verificationStatus: 'verified',
      confidenceScore: 100
    });
    if (updated) count++;
  }

  db.logAudit('XÁC_MINH_HÀNG_LOẠT', 'Người dùng', `Đã xác minh ${count} câu hỏi`);
  res.json({ success: true, count });
});

app.post('/api/questions/batch-delete', (req: Request, res: Response) => {
  const { questionIds } = req.body;
  if (!Array.isArray(questionIds)) {
    return res.status(400).json({ error: 'questionIds phải là một danh sách' });
  }

  let count = 0;
  for (const id of questionIds) {
    if (db.deleteQuestion(id)) count++;
  }

  db.logAudit('XÓA_HÀNG_LOẠT', 'Người dùng', `Đã xóa ${count} câu hỏi`);
  res.json({ success: true, count });
});

app.get('/api/questions/detect-duplicates', (_req: Request, res: Response) => {
  const questions = db.getQuestions();
  const duplicatePairs: { q1: Question; q2: Question; similarity: number }[] = [];

  // Simple clean text similarity detection
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const q1 = questions[i];
      const q2 = questions[j];
      if (q1.subjectId !== q2.subjectId) continue;

      const s1 = q1.content.toLowerCase().replace(/[^a-z0-9]/g, '');
      const s2 = q2.content.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (s1 === s2 && s1.length > 5) {
        duplicatePairs.push({ q1, q2, similarity: 100 });
      } else if (s1.includes(s2) || s2.includes(s1)) {
        const sim = Math.round((Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length)) * 100);
        if (sim > 80) {
          duplicatePairs.push({ q1, q2, similarity: sim });
        }
      }
    }
  }

  res.json(duplicatePairs);
});

// ------------------------------------------
// Subject Rules
// ------------------------------------------
app.get('/api/subjects', (_req: Request, res: Response) => {
  res.json(db.getSubjectRules());
});

app.put('/api/subjects/:id', (req: Request, res: Response) => {
  const updated = db.updateSubjectRule(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Không tìm thấy quy tắc môn học' });
  }
  db.logAudit('CẬP_NHẬT_QUY_TẮC_MÔN', 'Người dùng', `Cập nhật quy tắc môn: ${updated.name}`);
  res.json(updated);
});

// ------------------------------------------
// Exam Templates
// ------------------------------------------
app.get('/api/templates', (_req: Request, res: Response) => {
  res.json(db.getTemplates());
});

app.post('/api/templates', (req: Request, res: Response) => {
  try {
    const tmplData = req.body;
    const newTemplate = {
      ...tmplData,
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      version: 1,
      isSystem: false,
      createdAt: new Date().toISOString()
    };
    db.addTemplate(newTemplate);
    db.logAudit('TẠO_TEMPLATE', 'Người dùng', `Tạo template cấu trúc đề: ${newTemplate.name}`);
    res.json(newTemplate);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/templates/:id', (req: Request, res: Response) => {
  const updated = db.updateTemplate(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Không tìm thấy template' });
  }
  db.logAudit('CẬP_NHẬT_TEMPLATE', 'Người dùng', `Cập nhật template: ${updated.name}`);
  res.json(updated);
});

app.delete('/api/templates/:id', (req: Request, res: Response) => {
  const success = db.deleteTemplate(req.params.id);
  if (success) {
    db.logAudit('XÓA_TEMPLATE', 'Người dùng', `Đã xóa template ID: ${req.params.id}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Không tìm thấy template' });
  }
});

// ------------------------------------------
// Exam Generation & Management
// ------------------------------------------
app.post('/api/exams/check-feasibility', (req: Request, res: Response) => {
  try {
    const questions = db.getQuestions();
    const report = checkExamFeasibility(req.body, questions);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/exams/generate', (req: Request, res: Response) => {
  try {
    const questions = db.getQuestions();
    const previousExams = db.getExams();
    const usedQuestionIds = new Set<string>();

    for (const ex of previousExams) {
      for (const q of ex.questions) {
        usedQuestionIds.add(q.id);
      }
    }

    const { exam } = generateExam(req.body, questions, usedQuestionIds);
    db.addExam(exam);
    db.logAudit('TẠO_ĐỀ_THI', 'Người dùng', `Tạo đề thi mới: ${exam.title} (${exam.questions.length} câu)`);
    res.json(exam);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/exams', (_req: Request, res: Response) => {
  res.json(db.getExams());
});

app.get('/api/exams/:id', (req: Request, res: Response) => {
  const exam = db.getExams().find((e) => e.id === req.params.id);
  if (!exam) {
    return res.status(404).json({ error: 'Không tìm thấy đề thi' });
  }
  res.json(exam);
});

app.put('/api/exams/:id', (req: Request, res: Response) => {
  const updated = db.updateExam(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Không tìm thấy đề thi' });
  }
  res.json(updated);
});

app.delete('/api/exams/:id', (req: Request, res: Response) => {
  const success = db.deleteExam(req.params.id);
  if (success) {
    db.logAudit('XÓA_ĐỀ_THI', 'Người dùng', `Đã xóa đề thi ID: ${req.params.id}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Không tìm thấy đề thi' });
  }
});

// ------------------------------------------
// AI Exam Solving (STRICTLY OPT-IN)
// ------------------------------------------
app.post('/api/exams/:id/solve', async (req: Request, res: Response) => {
  try {
    const { solve_enabled, scope, selectedQuestionIds, detailLevel } = req.body;

    // Backend authorization / flag check
    if (!solve_enabled) {
      return res.status(403).json({
        error: 'Chức năng giải đề chưa được kích hoạt bởi người dùng. Yêu cầu bật solve_enabled.'
      });
    }

    const exam = db.getExams().find((e) => e.id === req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'Không tìm thấy đề thi' });
    }

    const subjectRule = db.getSubjectRules().find((s) => s.id === exam.subjectId);

    // Update status to processing
    db.updateExam(exam.id, { solve_status: 'processing', solve_enabled: true });

    const solveResult = await solveExamQuestions({
      subjectName: exam.subjectName,
      solvingGuidelines: subjectRule?.solvingGuidelines,
      questions: exam.questions,
      solveScope: scope || 'all',
      selectedQuestionIds,
      detailLevel: detailLevel || 'step_by_step'
    });

    const updatedExam = db.updateExam(exam.id, {
      solve_status: 'completed',
      solvedSolutions: solveResult.solutions
    });

    db.logAudit(
      'GIẢI_ĐỀ_THI_AI',
      'Người dùng',
      `Giải thành công ${solveResult.solutions.length} câu trong đề ${exam.title}`
    );

    res.json({ success: true, solutions: solveResult.solutions, exam: updatedExam });
  } catch (err: any) {
    console.error('Solve error:', err);
    if (req.params.id) {
      db.updateExam(req.params.id, { solve_status: 'error' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// Grading Center (STRICTLY OPT-IN)
// ------------------------------------------
app.post('/api/submissions/grade', async (req: Request, res: Response) => {
  try {
    const {
      grading_enabled,
      examId,
      studentId,
      studentName,
      variantCode,
      answers,
      allowAiEssayGrading
    } = req.body;

    if (!grading_enabled) {
      return res.status(403).json({
        error: 'Chức năng chấm bài chưa được kích hoạt bởi người dùng. Yêu cầu bật grading_enabled.'
      });
    }

    const exam = db.getExams().find((e) => e.id === examId);
    if (!exam) {
      return res.status(404).json({ error: 'Không tìm thấy đề thi tương ứng' });
    }

    const subjectRule = db.getSubjectRules().find((s) => s.id === exam.subjectId);

    const submission = await gradeSubmission(
      exam,
      {
        studentId,
        studentName,
        variantCode: variantCode || '101',
        answers: answers || []
      },
      subjectRule,
      allowAiEssayGrading
    );

    db.addSubmission(submission);
    db.logAudit(
      'CHẤM_BÀI_THI',
      'Người dùng',
      `Đã chấm bài cho thí sinh ${submission.studentName} (Điểm: ${submission.totalScore}/${submission.maxScore})`
    );

    res.json(submission);
  } catch (err: any) {
    console.error('Grading error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/submissions', (_req: Request, res: Response) => {
  res.json(db.getSubmissions());
});

app.get('/api/submissions/:id', (req: Request, res: Response) => {
  const sub = db.getSubmissions().find((s) => s.id === req.params.id);
  if (!sub) {
    return res.status(404).json({ error: 'Không tìm thấy bài làm' });
  }
  res.json(sub);
});

app.put('/api/submissions/:id/override', (req: Request, res: Response) => {
  const { questionId, teacherPoints, teacherNote, teacherName } = req.body;
  const sub = db.getSubmissions().find((s) => s.id === req.params.id);
  if (!sub) {
    return res.status(404).json({ error: 'Không tìm thấy bài làm' });
  }

  const resultItem = sub.gradedResults.find((r) => r.questionId === questionId);
  if (resultItem) {
    resultItem.teacherOverriddenPoints = teacherPoints;
    resultItem.teacherNote = teacherNote;
    resultItem.awardedPoints = teacherPoints;
    resultItem.needsTeacherReview = false;
  }

  // Recalculate total score
  const newTotal = sub.gradedResults.reduce((sum, r) => sum + r.awardedPoints, 0);
  sub.totalScore = Math.round(newTotal * 100) / 100;

  // Check if any other question still needs review
  const stillNeedsReview = sub.gradedResults.some((r) => r.needsTeacherReview);
  sub.grading_status = stillNeedsReview ? 'needs_teacher_review' : 'confirmed';
  sub.teacherConfirmedBy = teacherName || 'Giáo viên bộ môn';
  sub.teacherConfirmedAt = new Date().toISOString();

  db.save();
  db.logAudit(
    'GIÁO_VIÊN_DUYỆT_ĐIỂM',
    teacherName || 'Giáo viên',
    `Duyệt điểm bài làm của ${sub.studentName} (Tổng điểm mới: ${sub.totalScore})`
  );

  res.json(sub);
});

// ------------------------------------------
// Real File Exports (DOCX, Excel)
// ------------------------------------------
app.get('/api/export/exam-docx', async (req: Request, res: Response) => {
  try {
    const { examId, variantCode, type } = req.query;
    const exam = db.getExams().find((e) => e.id === examId);
    if (!exam) {
      return res.status(404).json({ error: 'Không tìm thấy đề thi' });
    }

    const buffer = await generateExamDocx(
      exam,
      (variantCode as string) || '101',
      (type as any) || 'student'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(exam.title)}_${variantCode || '101'}.docx"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/exam-excel', (req: Request, res: Response) => {
  try {
    const { examId } = req.query;
    const exam = db.getExams().find((e) => e.id === examId);
    if (!exam) {
      return res.status(404).json({ error: 'Không tìm thấy đề thi' });
    }

    const buffer = generateExamAnswersExcel(exam);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Bang_Dap_An_${encodeURIComponent(exam.title)}.xlsx"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/questions-excel', (req: Request, res: Response) => {
  try {
    const questions = db.getQuestions();
    const buffer = generateQuestionBankExcel(questions);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Ngan_Hang_Cau_Hoi_Sao_Luu.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// Vite integration in Dev / Static files in Prod
// ------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Exam Bank Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
