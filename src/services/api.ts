import {
  Question,
  SourceDocument,
  SubjectRule,
  ExamTemplate,
  Exam,
  ExamSubmission,
  DashboardStats
} from '../types/index.ts';

export const api = {
  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats');
    if (!res.ok) throw new Error('Không thể tải thống kê');
    return res.json();
  },

  async getAuditLogs(): Promise<any[]> {
    const res = await fetch('/api/audit-logs');
    if (!res.ok) throw new Error('Không thể tải nhật ký');
    return res.json();
  },

  // Documents
  async getDocuments(): Promise<SourceDocument[]> {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error('Không thể tải danh sách tài liệu');
    return res.json();
  },

  async uploadAndAnalyze(payload: {
    fileName: string;
    fileSize: number;
    fileType: string;
    text?: string;
    base64Data?: string;
    mimeType?: string;
    isScan?: boolean;
    subjectHint?: string;
  }): Promise<{
    document: SourceDocument;
    extractedCount: number;
    questions: Question[];
    summary: string;
  }> {
    const res = await fetch('/api/documents/upload-and-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi khi tải và phân tích tài liệu');
    }
    return res.json();
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa tài liệu');
  },

  // Questions
  async getQuestions(filters?: {
    search?: string;
    subjectId?: string;
    topic?: string;
    questionType?: string;
    difficulty?: string;
    verificationStatus?: string;
  }): Promise<Question[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });
    }
    const res = await fetch(`/api/questions?${params.toString()}`);
    if (!res.ok) throw new Error('Không thể tải ngân hàng câu hỏi');
    return res.json();
  },

  async createQuestion(question: Partial<Question>): Promise<Question> {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    });
    if (!res.ok) throw new Error('Không thể tạo câu hỏi');
    return res.json();
  },

  async updateQuestion(id: string, updates: Partial<Question>): Promise<Question> {
    const res = await fetch(`/api/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Không thể cập nhật câu hỏi');
    return res.json();
  },

  async deleteQuestion(id: string): Promise<void> {
    const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa câu hỏi');
  },

  async batchVerifyQuestions(questionIds: string[]): Promise<{ count: number }> {
    const res = await fetch('/api/questions/batch-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIds })
    });
    if (!res.ok) throw new Error('Lỗi khi xác minh hàng loạt');
    return res.json();
  },

  async batchDeleteQuestions(questionIds: string[]): Promise<{ count: number }> {
    const res = await fetch('/api/questions/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIds })
    });
    if (!res.ok) throw new Error('Lỗi khi xóa hàng loạt');
    return res.json();
  },

  async detectDuplicates(): Promise<{ q1: Question; q2: Question; similarity: number }[]> {
    const res = await fetch('/api/questions/detect-duplicates');
    if (!res.ok) throw new Error('Không thể kiểm tra câu trùng');
    return res.json();
  },

  // Subjects
  async getSubjects(): Promise<SubjectRule[]> {
    const res = await fetch('/api/subjects');
    if (!res.ok) throw new Error('Không thể tải môn học');
    return res.json();
  },

  async updateSubject(id: string, updates: Partial<SubjectRule>): Promise<SubjectRule> {
    const res = await fetch(`/api/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Không thể cập nhật môn học');
    return res.json();
  },

  // Templates
  async getTemplates(): Promise<ExamTemplate[]> {
    const res = await fetch('/api/templates');
    if (!res.ok) throw new Error('Không thể tải danh sách template');
    return res.json();
  },

  async createTemplate(template: Partial<ExamTemplate>): Promise<ExamTemplate> {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    if (!res.ok) throw new Error('Không thể lưu template');
    return res.json();
  },

  async updateTemplate(id: string, updates: Partial<ExamTemplate>): Promise<ExamTemplate> {
    const res = await fetch(`/api/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Không thể cập nhật template');
    return res.json();
  },

  async deleteTemplate(id: string): Promise<void> {
    const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa template');
  },

  // Exams
  async checkExamFeasibility(payload: any): Promise<any> {
    const res = await fetch('/api/exams/check-feasibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Lỗi kiểm tra tính khả thi');
    return res.json();
  },

  async generateExam(payload: any): Promise<Exam> {
    const res = await fetch('/api/exams/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi khi tạo đề thi');
    }
    return res.json();
  },

  async getExams(): Promise<Exam[]> {
    const res = await fetch('/api/exams');
    if (!res.ok) throw new Error('Không thể tải danh sách đề thi');
    return res.json();
  },

  async getExam(id: string): Promise<Exam> {
    const res = await fetch(`/api/exams/${id}`);
    if (!res.ok) throw new Error('Không thể tải chi tiết đề thi');
    return res.json();
  },

  async deleteExam(id: string): Promise<void> {
    const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa đề thi');
  },

  // AI Exam Solving (Opt-in)
  async solveExam(
    examId: string,
    params: {
      solve_enabled: boolean;
      scope?: 'all' | 'selected';
      selectedQuestionIds?: string[];
      detailLevel?: 'answers_only' | 'step_by_step';
    }
  ): Promise<any> {
    const res = await fetch(`/api/exams/${examId}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi khi giải đề thi');
    }
    return res.json();
  },

  // Grading Center (Opt-in)
  async gradeSubmission(payload: {
    grading_enabled: boolean;
    examId: string;
    studentId?: string;
    studentName?: string;
    variantCode?: string;
    answers: any[];
    allowAiEssayGrading?: boolean;
  }): Promise<ExamSubmission> {
    const res = await fetch('/api/submissions/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi khi chấm bài');
    }
    return res.json();
  },

  async getSubmissions(): Promise<ExamSubmission[]> {
    const res = await fetch('/api/submissions');
    if (!res.ok) throw new Error('Không thể tải danh sách bài chấm');
    return res.json();
  },

  async getSubmission(id: string): Promise<ExamSubmission> {
    const res = await fetch(`/api/submissions/${id}`);
    if (!res.ok) throw new Error('Không thể tải chi tiết bài chấm');
    return res.json();
  },

  async teacherOverrideScore(
    submissionId: string,
    payload: {
      questionId: string;
      teacherPoints: number;
      teacherNote?: string;
      teacherName?: string;
    }
  ): Promise<ExamSubmission> {
    const res = await fetch(`/api/submissions/${submissionId}/override`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Lỗi khi duyệt điểm');
    return res.json();
  }
};
