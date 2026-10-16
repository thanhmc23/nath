import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit3,
  Download,
  Copy,
  Layers,
  Sparkles,
  Eye,
  X,
  FileSpreadsheet,
  Check,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api.ts';
import {
  Question,
  QuestionType,
  Difficulty,
  VerificationStatus,
  SubjectRule
} from '../types/index.ts';
import { MathRenderer } from '../components/MathRenderer.tsx';

interface QuestionsViewProps {
  questions: Question[];
  subjects: SubjectRule[];
  onRefresh: () => void;
}

export const QuestionsView: React.FC<QuestionsViewProps> = ({
  questions,
  subjects,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicatePairs, setDuplicatePairs] = useState<{ q1: Question; q2: Question; similarity: number }[]>([]);
  const [isDetectingDuplicates, setIsDetectingDuplicates] = useState(false);

  // Edit / Add Modal state
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Preview Modal
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedSubject !== 'all' && q.subjectId !== selectedSubject) return false;
      if (selectedType !== 'all' && q.questionType !== selectedType) return false;
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
      if (selectedStatus !== 'all' && q.verificationStatus !== selectedStatus) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const inContent = q.content.toLowerCase().includes(query);
        const inCode = q.code.toLowerCase().includes(query);
        const inTopic = q.topic.toLowerCase().includes(query);
        const inExpl = q.explanation ? q.explanation.toLowerCase().includes(query) : false;
        if (!inContent && !inCode && !inTopic && !inExpl) return false;
      }

      return true;
    });
  }, [questions, selectedSubject, selectedType, selectedDifficulty, selectedStatus, searchTerm]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchVerify = async () => {
    if (selectedIds.size === 0) return;
    await api.batchVerifyQuestions(Array.from(selectedIds));
    setSelectedIds(new Set());
    onRefresh();
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Bạn có chắc muốn xóa ${selectedIds.size} câu hỏi được chọn khỏi ngân hàng?`)) {
      await api.batchDeleteQuestions(Array.from(selectedIds));
      setSelectedIds(new Set());
      onRefresh();
    }
  };

  const handleCheckDuplicates = async () => {
    setIsDetectingDuplicates(true);
    setDuplicateModalOpen(true);
    try {
      const pairs = await api.detectDuplicates();
      setDuplicatePairs(pairs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetectingDuplicates(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.content) return;

    try {
      if (isCreating) {
        await api.createQuestion(editingQuestion);
      } else if (editingQuestion.id) {
        await api.updateQuestion(editingQuestion.id, editingQuestion);
      }
      setEditingQuestion(null);
      setIsCreating(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu câu hỏi');
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa câu hỏi này?')) {
      await api.deleteQuestion(id);
      onRefresh();
    }
  };

  const handleVerifySingle = async (id: string) => {
    await api.updateQuestion(id, { verificationStatus: 'verified', confidenceScore: 100 });
    onRefresh();
  };

  const getDifficultyBadge = (d: Difficulty) => {
    switch (d) {
      case 'nhan_biet':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">Nhận biết</span>;
      case 'thong_hieu':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800">Thông hiểu</span>;
      case 'van_dung':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">Vận dụng</span>;
      case 'van_dung_cao':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">Vận dụng cao</span>;
      default:
        return null;
    }
  };

  const getTypeLabel = (t: QuestionType) => {
    switch (t) {
      case 'single_choice':
        return 'Trắc nghiệm 1 đáp án';
      case 'multiple_choice':
        return 'Nhiều đáp án đúng';
      case 'true_false':
        return 'Đúng / Sai';
      case 'short_answer':
        return 'Trả lời ngắn';
      case 'essay':
        return 'Tự luận';
      case 'matching_or_fill':
        return 'Ghép nối / Điền khuyết';
      default:
        return t;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Ngân hàng câu hỏi chuẩn hóa ({questions.length})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý, tìm kiếm, phát hiện câu hỏi trùng và phân loại ma trận theo đúng chương trình GDPT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCheckDuplicates}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-600" />
            Kiểm tra câu trùng
          </button>
          <a
            href="/api/export/questions-excel"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Xuất Excel sao lưu
          </a>
          <button
            onClick={() => {
              setIsCreating(true);
              setEditingQuestion({
                code: `Q-${Date.now().toString().slice(-5)}`,
                content: '',
                questionType: 'single_choice',
                subjectId: selectedSubject !== 'all' ? selectedSubject : subjects[0]?.id || 'sub-toan',
                subjectName: subjects[0]?.name || 'Toán học',
                topic: 'Chủ đề 1',
                difficulty: 'thong_hieu',
                defaultPoints: 0.25,
                options: [
                  { id: 'A', content: '', isCorrect: true },
                  { id: 'B', content: '', isCorrect: false },
                  { id: 'C', content: '', isCorrect: false },
                  { id: 'D', content: '', isCorrect: false }
                ],
                correctAnswers: ['A'],
                verificationStatus: 'verified',
                confidenceScore: 100
              });
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Thêm câu hỏi mới
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo nội dung, mã, lời giải..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="all">Tất cả môn học</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="all">Tất cả dạng câu hỏi</option>
              <option value="single_choice">Trắc nghiệm 1 đáp án</option>
              <option value="multiple_choice">Trắc nghiệm nhiều đáp án</option>
              <option value="true_false">Đúng / Sai (nhiều ý)</option>
              <option value="short_answer">Trả lời ngắn</option>
              <option value="essay">Tự luận</option>
              <option value="matching_or_fill">Ghép nối / Điền khuyết</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="all">Tất cả mức độ</option>
              <option value="nhan_biet">Nhận biết</option>
              <option value="thong_hieu">Thông hiểu</option>
              <option value="van_dung">Vận dụng</option>
              <option value="van_dung_cao">Vận dụng cao</option>
            </select>
          </div>

          {/* Verification Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="verified">Đã xác minh (Verified)</option>
              <option value="extracted">Mới trích xuất (Extracted)</option>
              <option value="needs_review">Cần kiểm tra (Needs Review)</option>
              <option value="ai_generated">Do AI tạo (AI Generated)</option>
            </select>
          </div>
        </div>

        {/* Batch Actions Bar (visible when items selected) */}
        {selectedIds.size > 0 && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between bg-indigo-50/60 p-3 rounded-xl">
            <span className="text-xs font-bold text-indigo-900">
              Đã chọn {selectedIds.size} câu hỏi:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchVerify}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Xác minh hàng loạt
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa hàng loạt
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Questions List Table / Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-2">
          <label className="flex items-center gap-2 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0}
              onChange={handleSelectAll}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Chọn tất cả ({filteredQuestions.length} câu phù hợp)</span>
          </label>
          <span>Hiển thị câu hỏi kèm đáp án &amp; nguồn gốc</span>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">Không tìm thấy câu hỏi phù hợp</h4>
            <p className="text-xs text-slate-500 mt-1">
              Thử điều chỉnh lại bộ lọc hoặc tải thêm tài liệu đề thi vào hệ thống.
            </p>
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isSelected = selectedIds.has(q.id);
            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl p-5 border transition-all ${
                  isSelected ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/10' : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(q.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-xs text-indigo-600">{q.code}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {q.subjectName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                      {getTypeLabel(q.questionType)}
                    </span>
                    {getDifficultyBadge(q.difficulty)}
                    <span className="text-[11px] font-semibold text-slate-400">
                      {q.defaultPoints} điểm
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {q.verificationStatus === 'verified' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã xác minh (100%)
                      </span>
                    ) : q.verificationStatus === 'ai_generated' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        <Sparkles className="w-3 h-3" />
                        Do AI tạo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <AlertTriangle className="w-3 h-3" />
                        Chưa duyệt ({q.confidenceScore}%)
                      </span>
                    )}

                    <button
                      onClick={() => setPreviewQuestion(q)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Xem trước định dạng đề thi"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setEditingQuestion(JSON.parse(JSON.stringify(q)));
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Chỉnh sửa câu hỏi"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSingle(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa câu hỏi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="pt-3 text-slate-900 text-xs sm:text-sm font-medium leading-relaxed">
                  <MathRenderer content={q.content} />
                </div>

                {/* Options for single / multiple choice */}
                {q.options && q.options.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt) => {
                      const isCorrect = opt.isCorrect || q.correctAnswers?.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                            isCorrect
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold'
                              : 'bg-slate-50/60 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <div className="flex-1">
                            <MathRenderer content={opt.content} />
                          </div>
                          {isCorrect && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Propositions for True/False */}
                {q.propositions && q.propositions.length > 0 && (
                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-700 text-[11px] mb-1">
                      Các mệnh đề đánh giá (Chế độ: {q.trueFalseScoringMode === 'per_proposition' ? 'Chấm theo từng ý' : 'Chấm cả câu lớn'}):
                    </p>
                    {q.propositions.map((p) => (
                      <div key={p.id} className="flex items-start justify-between gap-3 py-1 border-b border-slate-200/60 last:border-0">
                        <div className="flex items-start gap-2 text-slate-800">
                          <span className="font-bold text-slate-900">{p.id})</span>
                          <span>{p.statement}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            p.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.isCorrect ? 'ĐÚNG' : 'SAI'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Short answer acceptable answers */}
                {q.questionType === 'short_answer' && q.acceptedAnswers && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2">
                    <span className="font-bold text-slate-700">Đáp án chấp nhận:</span>
                    <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {q.acceptedAnswers.join(' hoặc ')}
                    </span>
                    {q.unit && <span className="text-slate-500">Đơn vị: {q.unit}</span>}
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div className="mt-3 text-xs bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/70 text-slate-700">
                    <span className="font-bold text-indigo-900">Lời giải chi tiết: </span>
                    <MathRenderer content={q.explanation} />
                  </div>
                )}

                {/* Provenance footer */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                  <div className="flex items-center gap-3">
                    <span>Chủ đề: <b className="text-slate-600">{q.topic}</b></span>
                    {q.sourceDocumentName && (
                      <span>Nguồn: <b className="text-slate-600">{q.sourceDocumentName}</b> ({q.sourcePosition})</span>
                    )}
                  </div>
                  {q.verificationStatus !== 'verified' && (
                    <button
                      onClick={() => handleVerifySingle(q.id)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                    >
                      ✓ Xác minh câu hỏi này
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Duplicate Detection Modal */}
      {duplicateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Phát hiện câu hỏi trùng lặp trong kho</h3>
              </div>
              <button
                onClick={() => setDuplicateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isDetectingDuplicates ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Sparkles className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                  Đang quét và so sánh các cặp câu hỏi...
                </div>
              ) : duplicatePairs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  Không phát hiện câu hỏi nào trùng lặp hoặc tương đồng &gt; 80%.
                </div>
              ) : (
                duplicatePairs.map((pair, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900">
                        Cặp câu hỏi tương đồng {pair.similarity}%
                      </span>
                      <span className="text-[10px] text-slate-500">Cùng môn {pair.q1.subjectName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <p className="font-bold text-slate-600 text-[11px] mb-1">Mã: {pair.q1.code}</p>
                        <p className="text-slate-800 line-clamp-3">{pair.q1.content}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <p className="font-bold text-slate-600 text-[11px] mb-1">Mã: {pair.q2.code}</p>
                        <p className="text-slate-800 line-clamp-3">{pair.q2.content}</p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-amber-200/60">
                      <button
                        onClick={async () => {
                          await api.deleteQuestion(pair.q2.id);
                          setDuplicatePairs(duplicatePairs.filter((p) => p !== pair));
                          onRefresh();
                        }}
                        className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold text-xs cursor-pointer"
                      >
                        Xóa câu trùng ({pair.q2.code})
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveQuestion}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {isCreating ? 'Thêm câu hỏi mới vào ngân hàng' : `Chỉnh sửa câu hỏi ${editingQuestion.code}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Môn học</label>
                  <select
                    value={editingQuestion.subjectId}
                    onChange={(e) => {
                      const sub = subjects.find((s) => s.id === e.target.value);
                      setEditingQuestion({
                        ...editingQuestion,
                        subjectId: e.target.value,
                        subjectName: sub?.name || ''
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dạng câu hỏi</label>
                  <select
                    value={editingQuestion.questionType}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        questionType: e.target.value as QuestionType
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="single_choice">Trắc nghiệm 1 đáp án</option>
                    <option value="multiple_choice">Nhiều đáp án đúng</option>
                    <option value="true_false">Đúng / Sai</option>
                    <option value="short_answer">Trả lời ngắn</option>
                    <option value="essay">Tự luận</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức độ khó</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        difficulty: e.target.value as Difficulty
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="nhan_biet">Nhận biết</option>
                    <option value="thong_hieu">Thông hiểu</option>
                    <option value="van_dung">Vận dụng</option>
                    <option value="van_dung_cao">Vận dụng cao</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chủ đề / Chương</label>
                  <input
                    type="text"
                    value={editingQuestion.topic || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, topic: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
                    placeholder="Ví dụ: Đơn điệu hàm số"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội dung câu hỏi (sử dụng <code>$công thức$</code> cho toán học)
                </label>
                <textarea
                  rows={3}
                  value={editingQuestion.content || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium"
                  required
                />
              </div>

              {/* Options editor for single choice */}
              {editingQuestion.questionType === 'single_choice' && editingQuestion.options && (
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700">Các phương án A, B, C, D</label>
                  {editingQuestion.options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={editingQuestion.correctAnswers?.[0] === opt.id}
                        onChange={() => {
                          const newOpts = editingQuestion.options!.map((o) => ({
                            ...o,
                            isCorrect: o.id === opt.id
                          }));
                          setEditingQuestion({
                            ...editingQuestion,
                            options: newOpts,
                            correctAnswers: [opt.id]
                          });
                        }}
                      />
                      <span className="font-bold w-4">{opt.id}.</span>
                      <input
                        type="text"
                        value={opt.content}
                        onChange={(e) => {
                          const newOpts = [...editingQuestion.options!];
                          newOpts[idx].content = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200"
                        placeholder={`Nội dung phương án ${opt.id}...`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lời giải chi tiết</label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium"
                  placeholder="Trình bày các bước lập luận..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Lưu câu hỏi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Exam Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Xem trước câu hỏi trên đề thi</h3>
              <button onClick={() => setPreviewQuestion(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 font-serif">
              <div className="text-sm font-bold text-slate-900">
                Câu hỏi: <MathRenderer content={previewQuestion.content} />
              </div>

              {previewQuestion.options && (
                <div className="space-y-1.5 text-xs text-slate-800">
                  {previewQuestion.options.map((o) => (
                    <div key={o.id}>
                      <b>{o.id}.</b> <MathRenderer content={o.content} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
