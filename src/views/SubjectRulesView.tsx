import React, { useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  BookOpen,
  Edit2,
  Save,
  HelpCircle,
  X,
  Code2,
  Scale
} from 'lucide-react';
import { api } from '../services/api.ts';
import { SubjectRule } from '../types/index.ts';

interface SubjectRulesViewProps {
  subjects: SubjectRule[];
  onRefresh: () => void;
}

export const SubjectRulesView: React.FC<SubjectRulesViewProps> = ({ subjects, onRefresh }) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectRule | null>(
    subjects.length > 0 ? subjects[0] : null
  );

  const [editingRule, setEditingRule] = useState<SubjectRule | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      await api.updateSubject(editingRule.id, editingRule);
      setSelectedSubject(editingRule);
      setEditingRule(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu quy tắc môn học');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Cấu hình Quy tắc Riêng theo Môn học
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Mỗi môn học có bộ quy tắc xử lý công thức, chính sách tính điểm, thang làm tròn, rubric tự luận và hướng dẫn giải AI riêng biệt.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Subject tabs on left (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          {subjects.map((s) => {
            const isSelected = selectedSubject?.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedSubject(s)}
                className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-50/90 border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                  <span className="font-mono text-indigo-700 font-bold">{s.code}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">{s.referenceCurriculum}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                  <span>{s.chapters.length} chương</span>
                  <span>•</span>
                  <span>Làm tròn {s.scoringPolicy.rounding}đ</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Details Profile on Right (8 cols) */}
        <div className="lg:col-span-8">
          {selectedSubject && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    Hồ sơ quy tắc môn học
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900">{selectedSubject.name}</h3>
                </div>
                <button
                  onClick={() => setEditingRule(JSON.parse(JSON.stringify(selectedSubject)))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Chỉnh sửa quy tắc
                </button>
              </div>

              {/* Reference Curriculum & Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-500 block mb-1">Chương trình &amp; Bộ sách:</span>
                  <span className="font-semibold text-slate-900">{selectedSubject.referenceCurriculum}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-500 block mb-1">Cấp học áp dụng:</span>
                  <span className="font-semibold text-slate-900">{selectedSubject.gradeLevels.join(', ')}</span>
                </div>
              </div>

              {/* Scoring policies */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  Chính sách chấm điểm &amp; Làm tròn
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                    <span className="text-slate-500 font-medium">Bước làm tròn</span>
                    <div className="text-lg font-bold text-indigo-900 font-mono mt-1">
                      {selectedSubject.scoringPolicy.rounding} điểm
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                    <span className="text-slate-500 font-medium">Chấm nhiều đáp án</span>
                    <div className="text-sm font-bold text-indigo-900 mt-1">
                      {selectedSubject.scoringPolicy.multipleChoicePolicy === 'all_or_nothing'
                        ? 'Đúng hết mới có điểm'
                        : 'Tính điểm từng phần'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                    <span className="text-slate-500 font-medium">Chế độ Đúng / Sai</span>
                    <div className="text-sm font-bold text-indigo-900 mt-1">
                      {selectedSubject.scoringPolicy.trueFalsePolicy === 'per_proposition'
                        ? 'Chấm theo mệnh đề'
                        : 'Chấm cả câu lớn'}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Solving Guidelines */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  Quy tắc giải đề thi áp dụng cho AI
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedSubject.solvingGuidelines}
                </div>
              </div>

              {/* Rubric Criteria */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Tiêu chí chấm tự luận (Rubric mặc định):
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {selectedSubject.essayRubricCriteria.map((c, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Chapters & Topics List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Danh mục chương &amp; chủ đề ({selectedSubject.chapters.length} chương):
                </h4>
                <div className="space-y-2">
                  {selectedSubject.chapters.map((ch) => (
                    <div key={ch.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <span className="font-bold text-slate-800">{ch.name}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {ch.topics.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[11px]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl text-xs"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Chỉnh sửa quy tắc môn {editingRule.name}</h3>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chương trình tham chiếu</label>
                <input
                  type="text"
                  value={editingRule.referenceCurriculum}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, referenceCurriculum: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bước làm tròn điểm</label>
                  <select
                    value={editingRule.scoringPolicy.rounding}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        scoringPolicy: {
                          ...editingRule.scoringPolicy,
                          rounding: parseFloat(e.target.value) || 0.25
                        }
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  >
                    <option value={0.1}>0.1 điểm</option>
                    <option value={0.2}>0.2 điểm</option>
                    <option value={0.25}>0.25 điểm</option>
                    <option value={0.5}>0.5 điểm</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chính sách trắc nghiệm nhiều đáp án</label>
                  <select
                    value={editingRule.scoringPolicy.multipleChoicePolicy}
                    onChange={(e: any) =>
                      setEditingRule({
                        ...editingRule,
                        scoringPolicy: {
                          ...editingRule.scoringPolicy,
                          multipleChoicePolicy: e.target.value
                        }
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  >
                    <option value="all_or_nothing">Đúng tất cả mới có điểm</option>
                    <option value="partial_credit">Tính điểm từng phần</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hướng dẫn giải cho AI</label>
                <textarea
                  rows={4}
                  value={editingRule.solvingGuidelines}
                  onChange={(e) => setEditingRule({ ...editingRule, solvingGuidelines: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Lưu quy tắc
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
