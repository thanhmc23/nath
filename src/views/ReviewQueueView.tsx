import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Question } from '../types/index.ts';
import { MathRenderer } from '../components/MathRenderer.tsx';

interface ReviewQueueViewProps {
  questions: Question[];
  onRefresh: () => void;
  onNavigate: (tab: any) => void;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  questions,
  onRefresh,
  onNavigate
}) => {
  const unverifiedList = questions.filter(
    (q) => q.verificationStatus === 'extracted' || q.verificationStatus === 'needs_review'
  );

  const [activeItem, setActiveItem] = useState<Question | null>(
    unverifiedList.length > 0 ? unverifiedList[0] : null
  );

  const [customAnswer, setCustomAnswer] = useState<string>('');
  const [reviewNoteInput, setReviewNoteInput] = useState<string>('');

  const handleVerify = async (question: Question) => {
    await api.updateQuestion(question.id, {
      verificationStatus: 'verified',
      confidenceScore: 100,
      correctAnswers: customAnswer.trim() ? [customAnswer.trim()] : question.correctAnswers,
      reviewNote: reviewNoteInput.trim() || undefined
    });
    setCustomAnswer('');
    setReviewNoteInput('');
    onRefresh();
  };

  const handleVerifyAllHighConfidence = async () => {
    const highConfidence = unverifiedList.filter((q) => q.confidenceScore >= 90);
    if (highConfidence.length === 0) {
      alert('Không có câu hỏi nào đạt độ tin cậy >= 90%');
      return;
    }
    if (confirm(`Xác minh nhanh ${highConfidence.length} câu hỏi đạt độ tin cậy cao (>= 90%)?`)) {
      await api.batchVerifyQuestions(highConfidence.map((q) => q.id));
      onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Xóa câu hỏi không hợp lệ này?')) {
      await api.deleteQuestion(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Hàng đợi kiểm tra &amp; Xác minh ({unverifiedList.length})
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              Cần đối chiếu nguồn
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Đảm bảo tính trung thực: đối chiếu câu hỏi và đáp án với tài liệu gốc trước khi đưa vào tạo đề chính thức.
          </p>
        </div>

        {unverifiedList.length > 0 && (
          <button
            onClick={handleVerifyAllHighConfidence}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            Xác minh nhanh câu tin cậy cao (&gt;= 90%)
          </button>
        )}
      </div>

      {unverifiedList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Tất cả câu hỏi trong ngân hàng đã được kiểm duyệt!
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Không còn câu hỏi nào đang ở trạng thái chờ duyệt. Bạn có thể tiến hành tạo đề thi chuẩn hoặc nạp thêm tài liệu.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => onNavigate('generator')}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs cursor-pointer"
            >
              Tạo đề thi mới ngay
            </button>
            <button
              onClick={() => onNavigate('upload')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
            >
              Tải thêm tài liệu
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* List of unverified questions on Left (5 cols) */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
            {unverifiedList.map((q) => {
              const isSelected = activeItem?.id === q.id;
              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setActiveItem(q);
                    setCustomAnswer(q.correctAnswers?.[0] || '');
                  }}
                  className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-indigo-700">{q.code}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.confidenceScore >= 90
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Độ tin cậy: {q.confidenceScore}%
                    </span>
                  </div>
                  <div className="text-slate-800 line-clamp-2 font-medium">
                    <MathRenderer content={q.content} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[200px]">{q.sourceDocumentName}</span>
                    <span>{q.sourcePosition}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verification Workspace on Right (7 cols) */}
          <div className="lg:col-span-7">
            {activeItem && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5 sticky top-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Đối chiếu câu hỏi</span>
                    <h3 className="font-mono font-bold text-base text-slate-900">{activeItem.code}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                    Môn: {activeItem.subjectName}
                  </span>
                </div>

                {/* Source Provenance Box */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Tài liệu nguồn: <b>{activeItem.sourceDocumentName || 'Tài liệu tải lên'}</b></span>
                  </div>
                  <span className="font-mono text-slate-500 font-semibold">{activeItem.sourcePosition}</span>
                </div>

                {/* Content */}
                <div className="text-sm font-semibold text-slate-900 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <MathRenderer content={activeItem.content} />
                </div>

                {/* Options display */}
                {activeItem.options && activeItem.options.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700">Các phương án trích xuất:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {activeItem.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                            activeItem.correctAnswers?.includes(opt.id)
                              ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-950'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="font-bold w-4">{opt.id}.</span>
                          <MathRenderer content={opt.content} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verification Control */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-700 w-32">Đáp án xác minh:</label>
                    <input
                      type="text"
                      placeholder="Nhập hoặc sửa đáp án đúng (ví dụ: A, B, C hoặc 450)..."
                      value={customAnswer}
                      onChange={(e) => setCustomAnswer(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 font-bold text-indigo-700"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-700 w-32">Ghi chú kiểm duyệt:</label>
                    <input
                      type="text"
                      placeholder="Ghi chú đối chiếu trang sách, đề bài..."
                      value={reviewNoteInput}
                      onChange={(e) => setReviewNoteInput(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-700"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <button
                      onClick={() => handleDelete(activeItem.id)}
                      className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa câu không đạt chuẩn
                    </button>

                    <button
                      onClick={() => handleVerify(activeItem)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <Check className="w-4 h-4" />
                      Xác nhận câu hỏi chuẩn &amp; Đưa vào kho
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
