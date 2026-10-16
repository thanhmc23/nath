import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Edit3,
  Sparkles,
  ShieldAlert,
  X,
  Check,
  Download
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Exam, ExamSubmission, GradedQuestionResult } from '../types/index.ts';
import { MathRenderer } from '../components/MathRenderer.tsx';

interface GradingCenterViewProps {
  exams: Exam[];
  submissions: ExamSubmission[];
  onRefresh: () => void;
  onNavigate: (tab: any) => void;
}

export const GradingCenterView: React.FC<GradingCenterViewProps> = ({
  exams,
  submissions,
  onRefresh,
  onNavigate
}) => {
  const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(
    submissions.length > 0 ? submissions[0] : null
  );

  // New Grading Modal
  const [newGradingModalOpen, setNewGradingModalOpen] = useState(false);
  const [chosenExamId, setChosenExamId] = useState<string>(exams[0]?.id || '');
  const [chosenVariantCode, setChosenVariantCode] = useState<string>('101');
  const [studentIdInput, setStudentIdInput] = useState<string>('TS-2026-001');
  const [studentNameInput, setStudentNameInput] = useState<string>('Nguyễn Văn An');
  const [answersInput, setAnswersInput] = useState<Record<string, any>>({});
  const [propAnswersInput, setPropAnswersInput] = useState<Record<string, Record<string, boolean>>>({});
  const [allowAiEssayGrading, setAllowAiEssayGrading] = useState<boolean>(true);
  const [isSubmittingGrading, setIsSubmittingGrading] = useState<boolean>(false);
  const [gradingError, setGradingError] = useState<string | null>(null);

  // Teacher override modal state
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overridingItem, setOverridingItem] = useState<GradedQuestionResult | null>(null);
  const [overridePoints, setOverridePoints] = useState<number>(0);
  const [overrideNote, setOverrideNote] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('Thầy Trần Quốc Tuấn');

  const chosenExam = exams.find((e) => e.id === chosenExamId);
  const chosenVariant = chosenExam?.variants?.find((v) => v.variantCode === chosenVariantCode);
  const questionsInChosen = chosenVariant ? chosenVariant.shuffledQuestions : chosenExam?.questions || [];

  const handleStartGrading = () => {
    if (!chosenExamId && exams.length > 0) {
      setChosenExamId(exams[0].id);
    }
    // Pre-fill default answers for easy testing
    const defaultAns: Record<string, any> = {};
    const defaultProps: Record<string, Record<string, boolean>> = {};

    questionsInChosen.forEach((q) => {
      if (q.questionType === 'single_choice') {
        defaultAns[q.id] = q.correctAnswers?.[0] || 'A';
      } else if (q.questionType === 'multiple_choice') {
        defaultAns[q.id] = q.correctAnswers || ['A'];
      } else if (q.questionType === 'short_answer') {
        defaultAns[q.id] = q.acceptedAnswers?.[0] || '2';
      } else if (q.questionType === 'true_false' && q.propositions) {
        const props: Record<string, boolean> = {};
        q.propositions.forEach((p) => {
          props[p.id] = p.isCorrect;
        });
        defaultProps[q.id] = props;
      } else if (q.questionType === 'essay') {
        defaultAns[q.id] =
          'Theo tôi, tinh thần tự học giúp mỗi cá nhân chủ động cập nhật công nghệ mới, rèn luyện tư duy phản biện và không bị thay thế bởi AI trong tương lai.';
      }
    });

    setAnswersInput(defaultAns);
    setPropAnswersInput(defaultProps);
    setNewGradingModalOpen(true);
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenExamId) {
      alert('Vui lòng chọn đề thi để chấm bài');
      return;
    }

    setIsSubmittingGrading(true);
    setGradingError(null);

    try {
      const answersList = questionsInChosen.map((q) => ({
        questionId: q.id,
        studentAnswer: answersInput[q.id] || '',
        propositionAnswers: propAnswersInput[q.id]
      }));

      const submission = await api.gradeSubmission({
        grading_enabled: true,
        examId: chosenExamId,
        studentId: studentIdInput,
        studentName: studentNameInput,
        variantCode: chosenVariantCode,
        answers: answersList,
        allowAiEssayGrading
      });

      setSelectedSubmission(submission);
      setNewGradingModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setGradingError(err.message || 'Lỗi khi chấm bài');
    } finally {
      setIsSubmittingGrading(false);
    }
  };

  const handleSaveTeacherOverride = async () => {
    if (!selectedSubmission || !overridingItem) return;

    try {
      const updated = await api.teacherOverrideScore(selectedSubmission.id, {
        questionId: overridingItem.questionId,
        teacherPoints: overridePoints,
        teacherNote: overrideNote,
        teacherName
      });

      setSelectedSubmission(updated);
      setOverrideModalOpen(false);
      setOverridingItem(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xác nhận điểm');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Trung tâm Chấm bài &amp; Duyệt điểm ({submissions.length})
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
              Chuẩn GDPT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Chấm tự động theo thang điểm đã cấu hình, gợi ý điểm tự luận qua Rubric và bắt buộc giáo viên xác nhận điểm chính thức.
          </p>
        </div>

        <button
          onClick={handleStartGrading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nhập bài làm &amp; Chấm điểm mới
        </button>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <GraduationCap className="w-12 h-12 text-indigo-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Chưa có bài làm nào được chấm</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Nhấn nút &quot;Nhập bài làm &amp; Chấm điểm mới&quot; để chấm bài thi trắc nghiệm hoặc tự luận của thí sinh.
          </p>
          <button
            onClick={handleStartGrading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Bắt đầu chấm bài ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Submissions list sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-2.5 max-h-[80vh] overflow-y-auto pr-1">
            {submissions.map((sub) => {
              const isSelected = selectedSubmission?.id === sub.id;
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubmission(sub)}
                  className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900">{sub.studentName}</span>
                    <span className="font-mono text-indigo-700 font-bold text-sm">
                      {sub.totalScore}/{sub.maxScore}đ
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium truncate">{sub.examTitle}</p>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono">Mã: {sub.studentId} • Đề {sub.variantCode}</span>
                    {sub.grading_status === 'confirmed' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã duyệt
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        Chờ GV duyệt
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submission Detail on Right (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedSubmission && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                {/* Header Profile */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Kết quả chấm bài thi
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      Thí sinh: {selectedSubmission.studentName} ({selectedSubmission.studentId})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đề: <b>{selectedSubmission.examTitle}</b> • Mã đề: <b>{selectedSubmission.variantCode}</b> • Nộp:{' '}
                      {new Date(selectedSubmission.submittedAt).toLocaleTimeString('vi-VN')}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-black text-indigo-600 font-mono">
                      {selectedSubmission.totalScore}{' '}
                      <span className="text-sm font-normal text-slate-500">/{selectedSubmission.maxScore}đ</span>
                    </div>
                    {selectedSubmission.grading_status === 'confirmed' ? (
                      <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-end gap-1 mt-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        {selectedSubmission.teacherConfirmedBy || 'Giáo viên đã xác nhận'}
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-rose-600 flex items-center justify-end gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Có câu tự luận đang chờ giáo viên duyệt điểm
                      </div>
                    )}
                  </div>
                </div>

                {/* Question Breakdown List */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">Chi tiết điểm từng câu:</h4>

                  {selectedSubmission.gradedResults.map((result, idx) => {
                    return (
                      <div
                        key={result.questionId}
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          result.needsTeacherReview
                            ? 'bg-rose-50/40 border-rose-200'
                            : result.isCorrect
                            ? 'bg-emerald-50/30 border-emerald-200'
                            : result.isPartial
                            ? 'bg-amber-50/30 border-amber-200'
                            : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            Câu {idx + 1} ({result.questionType})
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {result.awardedPoints} / {result.maxPoints}đ
                            </span>
                            {result.needsTeacherReview ? (
                              <button
                                onClick={() => {
                                  setOverridingItem(result);
                                  setOverridePoints(result.awardedPoints);
                                  setOverrideNote(result.teacherNote || '');
                                  setOverrideModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                Giáo viên duyệt điểm
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setOverridingItem(result);
                                  setOverridePoints(result.awardedPoints);
                                  setOverrideNote(result.teacherNote || '');
                                  setOverrideModalOpen(true);
                                }}
                                className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer"
                                title="Sửa điểm giáo viên"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500">Bài làm thí sinh: </span>
                            <b className="text-slate-900">
                              {Array.isArray(result.studentAnswer)
                                ? result.studentAnswer.join(', ')
                                : result.studentAnswer || '(Bỏ trống)'}
                            </b>
                          </div>
                          <div>
                            <span className="text-slate-500">Đáp án chuẩn: </span>
                            <b className="text-emerald-700">
                              {Array.isArray(result.correctAnswer)
                                ? result.correctAnswer.join(', ')
                                : result.correctAnswer}
                            </b>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/50">
                          <span>Nhận xét: {result.feedback}</span>
                        </div>

                        {result.teacherNote && (
                          <div className="text-[11px] text-indigo-700 bg-indigo-50 p-2 rounded-lg font-medium">
                            Ghi chú của giáo viên: {result.teacherNote}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Grading Entry Modal */}
      {newGradingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSubmitGrade}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Nhập bài làm &amp; Chấm bài thi</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewGradingModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Exam & Variant select */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chọn đề thi</label>
                  <select
                    value={chosenExamId}
                    onChange={(e) => setChosenExamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã đề thi</label>
                  <select
                    value={chosenVariantCode}
                    onChange={(e) => setChosenVariantCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-indigo-700"
                  >
                    {chosenExam?.variants?.map((v) => (
                      <option key={v.variantCode} value={v.variantCode}>
                        Mã {v.variantCode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã số thí sinh (SBD)</label>
                  <input
                    type="text"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên thí sinh</label>
                  <input
                    type="text"
                    value={studentNameInput}
                    onChange={(e) => setStudentNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-900">
                  <input
                    type="checkbox"
                    checked={allowAiEssayGrading}
                    onChange={(e) => setAllowAiEssayGrading(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Bật gợi ý chấm tự luận bằng AI theo thang Rubric</span>
                </label>
                <p className="text-[11px] text-indigo-700 pl-6">
                  * Điểm AI đề xuất sẽ được gắn cờ &quot;Chờ giáo viên duyệt&quot; trước khi công bố chính thức.
                </p>
              </div>

              {/* Answers Grid */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs">Phiếu trả lời của thí sinh:</h4>

                <div className="space-y-3">
                  {questionsInChosen.map((q, idx) => (
                    <div key={q.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>Câu {idx + 1} ({q.questionType}):</span>
                        <span className="text-[11px] text-slate-500 font-normal truncate max-w-xs">{q.content}</span>
                      </div>

                      {/* Single choice radio buttons */}
                      {q.questionType === 'single_choice' && (
                        <div className="flex items-center gap-2">
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setAnswersInput({ ...answersInput, [q.id]: opt })}
                              className={`w-9 h-8 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                                answersInput[q.id] === opt
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* True/False propositions toggles */}
                      {q.questionType === 'true_false' && q.propositions && (
                        <div className="space-y-1.5 pt-1">
                          {q.propositions.map((p) => {
                            const val = propAnswersInput[q.id]?.[p.id];
                            return (
                              <div key={p.id} className="flex items-center justify-between text-[11px]">
                                <span>{p.id}) {p.statement}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = { ...(propAnswersInput[q.id] || {}), [p.id]: true };
                                      setPropAnswersInput({ ...propAnswersInput, [q.id]: next });
                                    }}
                                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                                      val === true
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white border border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    ĐÚNG
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = { ...(propAnswersInput[q.id] || {}), [p.id]: false };
                                      setPropAnswersInput({ ...propAnswersInput, [q.id]: next });
                                    }}
                                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                                      val === false
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-white border border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    SAI
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Short answer input */}
                      {q.questionType === 'short_answer' && (
                        <input
                          type="text"
                          value={answersInput[q.id] || ''}
                          onChange={(e) => setAnswersInput({ ...answersInput, [q.id]: e.target.value })}
                          placeholder="Điền đáp án số hoặc từ khóa..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
                        />
                      )}

                      {/* Essay input */}
                      {q.questionType === 'essay' && (
                        <textarea
                          rows={2}
                          value={answersInput[q.id] || ''}
                          onChange={(e) => setAnswersInput({ ...answersInput, [q.id]: e.target.value })}
                          placeholder="Nội dung bài làm tự luận của thí sinh..."
                          className="w-full p-2.5 rounded-lg border border-slate-200 bg-white font-sans text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {gradingError && (
              <div className="p-3 mx-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {gradingError}
              </div>
            )}

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setNewGradingModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmittingGrading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmittingGrading ? 'Đang chấm điểm...' : 'Xác nhận chấm bài'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teacher Override Modal */}
      {overrideModalOpen && overridingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Giáo viên duyệt và điều chỉnh điểm</h3>
              <button onClick={() => setOverrideModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Điểm số chính thức (Tối đa: {overridingItem.maxPoints}đ)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={overridingItem.maxPoints}
                  value={overridePoints}
                  onChange={(e) => setOverridePoints(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-indigo-700 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú / Nhận xét của giáo viên</label>
                <textarea
                  rows={3}
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="Nêu lý do cho điểm hoặc góp ý bài làm..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ tên giáo viên xác nhận</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveTeacherOverride}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Xác nhận điểm chính thức
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
