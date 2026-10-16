import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Layers,
  Clock,
  Sparkles,
  ArrowRight,
  Trash2,
  Edit2,
  CheckCircle2,
  X
} from 'lucide-react';
import { api } from '../services/api.ts';
import { ExamTemplate, SubjectRule, ExamSectionConfig } from '../types/index.ts';

interface TemplatesViewProps {
  templates: ExamTemplate[];
  subjects: SubjectRule[];
  onRefresh: () => void;
  onApplyTemplate: (templateId: string) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  subjects,
  onRefresh,
  onApplyTemplate
}) => {
  const [editingTemplate, setEditingTemplate] = useState<Partial<ExamTemplate> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.name) return;

    try {
      if (isCreating) {
        await api.createTemplate(editingTemplate);
      } else if (editingTemplate.id) {
        await api.updateTemplate(editingTemplate.id, editingTemplate);
      }
      setEditingTemplate(null);
      setIsCreating(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu template');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa template cấu trúc này?')) {
      await api.deleteTemplate(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Thư viện Template Cấu trúc Đề thi ({templates.length})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Các mẫu ma trận chuẩn hóa nhiều phần (Trắc nghiệm, Đúng/Sai, Trả lời ngắn, Tự luận) giúp tạo đề nhanh chóng.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreating(true);
            setEditingTemplate({
              name: 'Đề kiểm tra định kỳ (Template mới)',
              description: 'Cấu trúc đề kiểm tra kết hợp',
              subjectId: subjects[0]?.id || 'sub-toan',
              subjectName: subjects[0]?.name || 'Toán học',
              gradeLevel: 'Lớp 12',
              totalQuestions: 20,
              durationMinutes: 45,
              totalPoints: 10,
              sections: [
                {
                  id: 'sec-1',
                  title: 'Phần I: Trắc nghiệm 4 lựa chọn',
                  questionType: 'single_choice',
                  questionCount: 12,
                  pointsPerQuestion: 0.25,
                  difficultyRatio: { nhan_biet: 40, thong_hieu: 40, van_dung: 20, van_dung_cao: 0 }
                },
                {
                  id: 'sec-2',
                  title: 'Phần II: Câu hỏi Đúng / Sai',
                  questionType: 'true_false',
                  questionCount: 4,
                  pointsPerQuestion: 1.0,
                  difficultyRatio: { nhan_biet: 25, thong_hieu: 50, van_dung: 25, van_dung_cao: 0 }
                },
                {
                  id: 'sec-3',
                  title: 'Phần III: Trả lời ngắn',
                  questionType: 'short_answer',
                  questionCount: 4,
                  pointsPerQuestion: 0.75,
                  difficultyRatio: { nhan_biet: 0, thong_hieu: 50, van_dung: 50, van_dung_cao: 0 }
                }
              ],
              shuffleQuestions: true,
              shuffleOptions: true,
              allowReusedQuestions: false
            });
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Tạo Template mới
        </button>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-indigo-300 transition-all space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                  {tmpl.subjectName} • {tmpl.gradeLevel}
                </span>
                {tmpl.isSystem && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Chuẩn Bộ GD&amp;ĐT
                  </span>
                )}
              </div>

              <h3 className="font-bold text-slate-900 text-base leading-snug">{tmpl.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{tmpl.description}</p>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  {tmpl.totalQuestions} câu hỏi
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  {tmpl.durationMinutes} phút
                </span>
              </div>

              {/* Sections Breakdown */}
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Các phần trong đề:
                </p>
                <div className="space-y-1.5">
                  {tmpl.sections.map((sec, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between text-slate-700"
                    >
                      <span className="font-medium truncate max-w-[180px]">{sec.title}</span>
                      <span className="font-bold text-indigo-700 font-mono">
                        {sec.questionCount} câu
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {!tmpl.isSystem ? (
                <button
                  onClick={() => handleDelete(tmpl.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  title="Xóa template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">Template hệ thống</span>
              )}

              <button
                onClick={() => onApplyTemplate(tmpl.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <span>Tạo đề theo mẫu này</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Template Edit / Create Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {isCreating ? 'Tạo template cấu trúc đề thi mới' : 'Chỉnh sửa template'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên template</label>
                <input
                  type="text"
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả mục đích sử dụng</label>
                <textarea
                  rows={2}
                  value={editingTemplate.description || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Môn học</label>
                  <select
                    value={editingTemplate.subjectId}
                    onChange={(e) => {
                      const sub = subjects.find((s) => s.id === e.target.value);
                      setEditingTemplate({
                        ...editingTemplate,
                        subjectId: e.target.value,
                        subjectName: sub?.name || ''
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian (phút)</label>
                  <input
                    type="number"
                    value={editingTemplate.durationMinutes}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        durationMinutes: parseInt(e.target.value, 10) || 45
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tổng điểm</label>
                  <input
                    type="number"
                    value={editingTemplate.totalPoints}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        totalPoints: parseInt(e.target.value, 10) || 10
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              {/* Sections list editor */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-900">Cấu hình các phần trong đề:</h4>
                {editingTemplate.sections?.map((sec, idx) => (
                  <div key={sec.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500">Tiêu đề phần</label>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => {
                            const next = [...editingTemplate.sections!];
                            next[idx].title = e.target.value;
                            setEditingTemplate({ ...editingTemplate, sections: next });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Số câu</label>
                        <input
                          type="number"
                          value={sec.questionCount}
                          onChange={(e) => {
                            const next = [...editingTemplate.sections!];
                            next[idx].questionCount = parseInt(e.target.value, 10) || 0;
                            const totalQ = next.reduce((sum, s) => sum + s.questionCount, 0);
                            setEditingTemplate({
                              ...editingTemplate,
                              sections: next,
                              totalQuestions: totalQ
                            });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Lưu template
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
