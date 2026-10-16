import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  FileSpreadsheet,
  X,
  Shuffle,
  ShieldAlert,
  HelpCircle,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Exam, Question } from '../types/index.ts';
import { MathRenderer } from '../components/MathRenderer.tsx';

interface ExamsViewProps {
  exams: Exam[];
  selectedExamId?: string;
  onRefresh: () => void;
  onNavigate: (tab: any) => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  exams,
  selectedExamId,
  onRefresh,
  onNavigate
}) => {
  const [activeExam, setActiveExam] = useState<Exam | null>(
    (selectedExamId && exams.find((e) => e.id === selectedExamId)) || (exams.length > 0 ? exams[0] : null)
  );
  const [activeVariantCode, setActiveVariantCode] = useState<string>('101');
  const [viewMode, setViewMode] = useState<'student' | 'answer_key' | 'full_solution'>('student');

  // AI Exam Solver Modal State
  const [solverModalOpen, setSolverModalOpen] = useState(false);
  const [solveScope, setSolveScope] = useState<'all' | 'selected'>('all');
  const [solveDetailLevel, setSolveDetailLevel] = useState<'answers_only' | 'step_by_step'>('step_by_step');
  const [isSolving, setIsSolving] = useState(false);
  const [solveError, setSolveError] = useState<string | null>(null);

  const activeVariant = activeExam?.variants?.find((v) => v.variantCode === activeVariantCode);
  const displayQuestions = activeVariant ? activeVariant.shuffledQuestions : activeExam?.questions || [];

  const handleDeleteExam = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa đề thi này?')) {
      await api.deleteExam(id);
      setActiveExam(null);
      onRefresh();
    }
  };

  const handleTriggerSolveExam = async () => {
    if (!activeExam) return;
    setIsSolving(true);
    setSolveError(null);

    try {
      const res = await api.solveExam(activeExam.id, {
        solve_enabled: true,
        scope: solveScope,
        detailLevel: solveDetailLevel
      });

      setActiveExam(res.exam);
      setSolverModalOpen(false);
      setViewMode('full_solution');
      onRefresh();
    } catch (err: any) {
      setSolveError(err.message || 'Lỗi khi giải đề');
    } finally {
      setIsSolving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Danh sách Đề thi đã tạo ({exams.length})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Xem trước bản in, xáo trộn mã đề, xuất file Word/Excel và giải đề thi bằng AI theo yêu cầu.
          </p>
        </div>

        {activeExam && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Solver button */}
            <button
              onClick={() => setSolverModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Giải đề thi bằng AI
            </button>

            {/* Export DOCX */}
            <a
              href={`/api/export/exam-docx?examId=${activeExam.id}&variantCode=${activeVariantCode}&type=${viewMode}`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Tải Word (.docx)
            </a>

            {/* Export Excel */}
            <a
              href={`/api/export/exam-excel?examId=${activeExam.id}`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Bảng đáp án (.xlsx)
            </a>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              In đề thi
            </button>
          </div>
        )}
      </div>

      {exams.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <FileText className="w-12 h-12 text-indigo-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Chưa có đề thi nào được tạo</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy sử dụng trình tạo đề thi ma trận để tạo ngay bộ đề thi chuẩn có đầy đủ mã đề 101, 102.
          </p>
          <button
            onClick={() => onNavigate('generator')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Tạo đề thi mới ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Exam Selector sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-2.5 max-h-[80vh] overflow-y-auto pr-1">
            {exams.map((ex) => {
              const isSelected = activeExam?.id === ex.id;
              return (
                <div
                  key={ex.id}
                  onClick={() => {
                    setActiveExam(ex);
                    setActiveVariantCode(ex.variants?.[0]?.variantCode || '101');
                  }}
                  className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-indigo-700">{ex.code}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {ex.subjectName}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 line-clamp-1">{ex.title}</h4>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {ex.questions.length} câu • {ex.durationMinutes} phút
                    </span>
                    <span>{ex.variants?.length || 1} mã đề</span>
                  </div>

                  {ex.solve_status === 'completed' && (
                    <div className="mt-2 text-[10px] font-bold text-purple-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Đã có bản giải AI chi tiết
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Exam Preview Area (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {activeExam && (
              <>
                {/* Control bar: Variant switcher & View mode */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  {/* Variant codes */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Mã đề thi:</span>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      {activeExam.variants?.map((v) => (
                        <button
                          key={v.variantCode}
                          onClick={() => setActiveVariantCode(v.variantCode)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            activeVariantCode === v.variantCode
                              ? 'bg-white text-indigo-600 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {v.variantCode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mode switcher */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setViewMode('student')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'student'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Đề học sinh
                    </button>
                    <button
                      onClick={() => setViewMode('answer_key')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'answer_key'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Phiếu đáp án
                    </button>
                    <button
                      onClick={() => setViewMode('full_solution')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'full_solution'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Giải chi tiết
                    </button>
                  </div>
                </div>

                {/* Printable Clean Exam Sheet */}
                <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-md font-serif text-slate-900 space-y-6 print:border-none print:shadow-none print:p-0">
                  {/* Header Title */}
                  <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
                      BỘ GIÁO DỤC VÀ ĐÀO TẠO • NGÂN HÀNG ĐỀ THI QUỐC GIA
                    </p>
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight">
                      {activeExam.title}
                    </h2>
                    <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-700">
                      <span>Môn thi: {activeExam.subjectName}</span>
                      <span>•</span>
                      <span>Thời gian: {activeExam.durationMinutes} phút</span>
                      <span>•</span>
                      <span className="font-mono bg-slate-900 text-white px-2 py-0.5 rounded">
                        MÃ ĐỀ: {activeVariantCode}
                      </span>
                    </div>
                    {viewMode === 'student' && (
                      <p className="text-[11px] italic text-slate-500 pt-1">
                        (Đề thi gồm có {displayQuestions.length} câu hỏi. Thí sinh không được sử dụng tài liệu)
                      </p>
                    )}
                  </div>

                  {/* Body questions if student or full_solution */}
                  {(viewMode === 'student' || viewMode === 'full_solution') && (
                    <div className="space-y-6 text-sm">
                      {displayQuestions.map((q, idx) => {
                        const aiSolution = activeExam.solvedSolutions?.find((s) => s.questionId === q.id);

                        return (
                          <div key={q.id} className="space-y-2">
                            <div className="font-semibold leading-relaxed">
                              <span className="font-bold">Câu {idx + 1} ({q.defaultPoints} điểm): </span>
                              <MathRenderer content={q.content} />
                            </div>

                            {/* Options */}
                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 text-xs">
                                {q.options.map((opt) => (
                                  <div
                                    key={opt.id}
                                    className={`p-2 rounded-lg ${
                                      viewMode === 'full_solution' && (opt.isCorrect || q.correctAnswers?.includes(opt.id))
                                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold'
                                        : 'text-slate-800'
                                    }`}
                                  >
                                    <span className="font-bold mr-2">{opt.id}.</span>
                                    <MathRenderer content={opt.content} />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Propositions */}
                            {q.propositions && q.propositions.length > 0 && (
                              <div className="pl-4 space-y-1 text-xs">
                                {q.propositions.map((p) => (
                                  <div key={p.id} className="flex items-center justify-between py-0.5">
                                    <span>
                                      <b>{p.id})</b> {p.statement}
                                    </span>
                                    {viewMode === 'full_solution' && (
                                      <span
                                        className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded ${
                                          p.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        {p.isCorrect ? 'ĐÚNG' : 'SAI'}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Solutions Box if in full_solution mode */}
                            {viewMode === 'full_solution' && (
                              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-sans space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-emerald-800">
                                    Đáp án chính thức: {q.correctAnswers?.join(', ') || q.acceptedAnswers?.join(' / ') || 'Chấm theo rubric'}
                                  </span>
                                  {q.explanation && (
                                    <span className="text-[11px] text-slate-500 font-medium">Lời giải gốc từ tài liệu</span>
                                  )}
                                </div>

                                {q.explanation && (
                                  <div className="text-slate-700 text-xs italic">
                                    <MathRenderer content={q.explanation} />
                                  </div>
                                )}

                                {/* AI Reasoning if solved */}
                                {aiSolution && (
                                  <div className="pt-2 border-t border-slate-200/80 space-y-1">
                                    <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs">
                                      <Sparkles className="w-3.5 h-3.5" />
                                      Lời giải AI suy luận (Độ tin cậy: {aiSolution.confidence}%):
                                    </div>
                                    <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 text-[11px]">
                                      {aiSolution.reasoning.map((step, sIdx) => (
                                        <li key={sIdx}>{step}</li>
                                      ))}
                                    </ul>
                                    <div className="text-xs font-bold text-slate-900 mt-1">
                                      Đáp án AI: <span className="font-mono text-purple-700">{aiSolution.aiAnswer}</span>
                                      {aiSolution.matchesOriginalAnswer ? (
                                        <span className="ml-2 text-emerald-600 font-semibold text-[11px]">• Khớp đáp án tài liệu</span>
                                      ) : (
                                        <span className="ml-2 text-amber-600 font-semibold text-[11px]">• Có sự khác biệt với đáp án gốc</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Answer Key Grid View */}
                  {viewMode === 'answer_key' && (
                    <div className="space-y-4 font-sans">
                      <h4 className="font-bold text-base text-slate-900">
                        Bảng Đáp án Chuẩn - Mã đề {activeVariantCode}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-slate-200">
                          <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
                            <tr>
                              <th className="py-2.5 px-3 border border-slate-200">Câu số</th>
                              <th className="py-2.5 px-3 border border-slate-200">Mã câu</th>
                              <th className="py-2.5 px-3 border border-slate-200">Dạng bài</th>
                              <th className="py-2.5 px-3 border border-slate-200">Đáp án chuẩn</th>
                              <th className="py-2.5 px-3 border border-slate-200">Điểm</th>
                              <th className="py-2.5 px-3 border border-slate-200">Chủ đề</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayQuestions.map((q, idx) => {
                              let ans = '';
                              if (q.questionType === 'true_false' && q.propositions) {
                                ans = q.propositions.map((p) => `${p.id}:${p.isCorrect ? 'Đ' : 'S'}`).join(' | ');
                              } else if (q.correctAnswers) {
                                ans = q.correctAnswers.join(', ');
                              } else if (q.acceptedAnswers) {
                                ans = q.acceptedAnswers.join(' / ');
                              } else {
                                ans = 'Rubric';
                              }

                              return (
                                <tr key={q.id} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 border border-slate-200 font-bold">{idx + 1}</td>
                                  <td className="py-2 px-3 border border-slate-200 font-mono text-slate-500">{q.code}</td>
                                  <td className="py-2 px-3 border border-slate-200">{q.questionType}</td>
                                  <td className="py-2 px-3 border border-slate-200 font-bold text-emerald-700">{ans}</td>
                                  <td className="py-2 px-3 border border-slate-200 font-mono">{q.defaultPoints}</td>
                                  <td className="py-2 px-3 border border-slate-200 text-slate-600">{q.topic}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI Exam Solver Modal (Strict Opt-in Confirmation) */}
      {solverModalOpen && activeExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-purple-700">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Xác nhận Giải đề thi bằng AI</h3>
              </div>
              <button
                onClick={() => setSolverModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Strict Notice banner as required by prompt Section 15.1 */}
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                Nguyên tắc kích hoạt giải đề theo yêu cầu:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-purple-800">
                <li>Hệ thống <b>không bao giờ tự động giải</b> nếu không có sự xác nhận của người dùng.</li>
                <li>Kết quả AI giải sẽ <b>không ghi đè</b> đáp án gốc trong ngân hàng câu hỏi.</li>
                <li>Mô hình áp dụng đúng quy tắc môn học <b>{activeExam.subjectName}</b>.</li>
              </ul>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phạm vi câu hỏi giải:</label>
                <select
                  value={solveScope}
                  onChange={(e: any) => setSolveScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                >
                  <option value="all">Giải toàn bộ đề thi ({activeExam.questions.length} câu)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mức độ chi tiết của lời giải:</label>
                <select
                  value={solveDetailLevel}
                  onChange={(e: any) => setSolveDetailLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                >
                  <option value="step_by_step">Giải chi tiết từng bước (Step-by-step reasoning)</option>
                  <option value="answers_only">Chỉ đưa ra đáp án cuối cùng</option>
                </select>
              </div>
            </div>

            {solveError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {solveError}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSolverModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleTriggerSolveExam}
                disabled={isSolving}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-purple-600/20 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {isSolving ? 'Đang giải theo quy tắc môn học...' : 'Xác nhận giải đề bằng AI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
