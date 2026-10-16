import React, { useState, useEffect } from 'react';
import {
  FilePlus2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { api } from '../services/api.ts';
import {
  SubjectRule,
  ExamTemplate,
  ExamSectionConfig,
  QuestionType,
  Exam
} from '../types/index.ts';

interface ExamGeneratorViewProps {
  subjects: SubjectRule[];
  templates: ExamTemplate[];
  onExamCreated: (exam: Exam) => void;
  onNavigate: (tab: any) => void;
}

export const ExamGeneratorView: React.FC<ExamGeneratorViewProps> = ({
  subjects,
  templates,
  onExamCreated,
  onNavigate
}) => {
  const [examTitle, setExamTitle] = useState('Đề kiểm tra khảo sát chất lượng GDPT 2018');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || 'sub-toan');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [totalPoints, setTotalPoints] = useState(10);
  const [variantCount, setVariantCount] = useState(4);
  const [allowReusedQuestions, setAllowReusedQuestions] = useState(false);
  const [hasExplanationsInKey, setHasExplanationsInKey] = useState(true);
  const [priorityVerifiedOnly, setPriorityVerifiedOnly] = useState(true);

  // 6 Question Types configuration
  const [singleChoiceCount, setSingleChoiceCount] = useState(12);
  const [multipleChoiceCount, setMultipleChoiceCount] = useState(0);
  const [trueFalseCount, setTrueFalseCount] = useState(4);
  const [trueFalseMode, setTrueFalseMode] = useState<'per_question' | 'per_proposition'>('per_question');
  const [shortAnswerCount, setShortAnswerCount] = useState(6);
  const [essayCount, setEssayCount] = useState(0);
  const [matchingCount, setMatchingCount] = useState(0);

  // Difficulty target ratios (%)
  const [diffRatio, setDiffRatio] = useState({
    nhan_biet: 40,
    thong_hieu: 30,
    van_dung: 20,
    van_dung_cao: 10
  });

  const [feasibilityReport, setFeasibilityReport] = useState<any>(null);
  const [isCheckingFeasibility, setIsCheckingFeasibility] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Apply template when chosen
  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    if (tmplId === 'custom') return;

    const tmpl = templates.find((t) => t.id === tmplId);
    if (!tmpl) return;

    setExamTitle(`Đề thi theo template: ${tmpl.name}`);
    setSelectedSubjectId(tmpl.subjectId);
    setDurationMinutes(tmpl.durationMinutes);
    setTotalPoints(tmpl.totalPoints);
    setAllowReusedQuestions(tmpl.allowReusedQuestions);

    let sc = 0;
    let mc = 0;
    let tf = 0;
    let sa = 0;
    let es = 0;
    let mt = 0;

    tmpl.sections.forEach((s) => {
      if (s.questionType === 'single_choice') sc += s.questionCount;
      if (s.questionType === 'multiple_choice') mc += s.questionCount;
      if (s.questionType === 'true_false') {
        tf += s.questionCount;
        if (s.trueFalseCountMode) setTrueFalseMode(s.trueFalseCountMode);
      }
      if (s.questionType === 'short_answer') sa += s.questionCount;
      if (s.questionType === 'essay') es += s.questionCount;
      if (s.questionType === 'matching_or_fill') mt += s.questionCount;
    });

    setSingleChoiceCount(sc);
    setMultipleChoiceCount(mc);
    setTrueFalseCount(tf);
    setShortAnswerCount(sa);
    setEssayCount(es);
    setMatchingCount(mt);
  };

  const totalQuestionsCalculated =
    singleChoiceCount +
    multipleChoiceCount +
    trueFalseCount +
    shortAnswerCount +
    essayCount +
    matchingCount;

  // Build section configs array
  const buildSectionConfigs = (): ExamSectionConfig[] => {
    const sections: ExamSectionConfig[] = [];
    if (singleChoiceCount > 0) {
      sections.push({
        id: 'sec-sc',
        title: 'Phần I: Trắc nghiệm một phương án lựa chọn',
        questionType: 'single_choice',
        questionCount: singleChoiceCount,
        pointsPerQuestion: 0.25,
        difficultyRatio: diffRatio
      });
    }
    if (multipleChoiceCount > 0) {
      sections.push({
        id: 'sec-mc',
        title: 'Trắc nghiệm nhiều đáp án đúng',
        questionType: 'multiple_choice',
        questionCount: multipleChoiceCount,
        pointsPerQuestion: 0.5,
        difficultyRatio: diffRatio
      });
    }
    if (trueFalseCount > 0) {
      sections.push({
        id: 'sec-tf',
        title: 'Phần II: Trắc nghiệm Đúng / Sai (Mỗi câu gồm 4 mệnh đề a, b, c, d)',
        questionType: 'true_false',
        questionCount: trueFalseCount,
        pointsPerQuestion: 1.0,
        trueFalseCountMode: trueFalseMode,
        difficultyRatio: diffRatio
      });
    }
    if (shortAnswerCount > 0) {
      sections.push({
        id: 'sec-sa',
        title: 'Phần III: Trả lời ngắn',
        questionType: 'short_answer',
        questionCount: shortAnswerCount,
        pointsPerQuestion: 0.5,
        difficultyRatio: diffRatio
      });
    }
    if (essayCount > 0) {
      sections.push({
        id: 'sec-essay',
        title: 'Phần Tự luận',
        questionType: 'essay',
        questionCount: essayCount,
        pointsPerQuestion: 2.0,
        difficultyRatio: diffRatio
      });
    }
    if (matchingCount > 0) {
      sections.push({
        id: 'sec-match',
        title: 'Phần Ghép nối / Điền khuyết',
        questionType: 'matching_or_fill',
        questionCount: matchingCount,
        pointsPerQuestion: 1.0,
        difficultyRatio: diffRatio
      });
    }
    return sections;
  };

  // Check feasibility
  const handleCheckFeasibility = async () => {
    setIsCheckingFeasibility(true);
    setGenerationError(null);
    try {
      const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
      const sections = buildSectionConfigs();

      const report = await api.checkExamFeasibility({
        title: examTitle,
        subjectId: selectedSubjectId,
        subjectName: currentSubject?.name || 'Toán học',
        durationMinutes,
        totalPoints,
        sections,
        priorityVerifiedOnly
      });

      setFeasibilityReport(report);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsCheckingFeasibility(false);
    }
  };

  useEffect(() => {
    handleCheckFeasibility();
  }, [
    selectedSubjectId,
    singleChoiceCount,
    multipleChoiceCount,
    trueFalseCount,
    trueFalseMode,
    shortAnswerCount,
    essayCount,
    matchingCount,
    priorityVerifiedOnly
  ]);

  const handleGenerateExam = async () => {
    if (totalQuestionsCalculated === 0) {
      alert('Vui lòng chọn ít nhất 1 câu hỏi để tạo đề');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
      const sections = buildSectionConfigs();

      const createdExam = await api.generateExam({
        title: examTitle,
        subjectId: selectedSubjectId,
        subjectName: currentSubject?.name || 'Toán học',
        durationMinutes,
        totalPoints,
        templateId: selectedTemplateId !== 'custom' ? selectedTemplateId : undefined,
        allowReusedQuestions,
        hasExplanationsInKey,
        sections,
        variantCount,
        priorityVerifiedOnly
      });

      onExamCreated(createdExam);
    } catch (err: any) {
      setGenerationError(err.message || 'Lỗi khi tạo đề thi');
    } finally {
      setIsGenerating(false);
    }
  };

  const subjectCurrent = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Trình tạo Đề thi theo Ma trận &amp; Cấu hình
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Thiết lập số lượng từng dạng câu hỏi, tỷ lệ độ khó, sinh mã đề 101-104 tự động xáo trộn mà không làm sai lệch đáp án.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Config */}
        <div className="lg:col-span-2 space-y-5">
          {/* General Specs */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              1. Thông tin chung &amp; Template áp dụng
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Môn học nguồn</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-800"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cấu trúc mẫu (Template)</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-indigo-700"
                >
                  <option value="custom">-- Cấu hình tùy chỉnh --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">Tên đề thi</label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Thời gian (phút)</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 45)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Thang điểm tổng</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(parseInt(e.target.value, 10) || 10)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số mã đề sinh ra</label>
                <select
                  value={variantCount}
                  onChange={(e) => setVariantCount(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-indigo-700"
                >
                  <option value={1}>1 mã đề gốc</option>
                  <option value={2}>2 mã đề (101, 102)</option>
                  <option value={4}>4 mã đề (101, 102, 103, 104)</option>
                  <option value={6}>6 mã đề (101 - 106)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 6 Question Types Matrix */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                2. Quy định số lượng theo từng dạng câu hỏi (Bắt buộc)
              </h3>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                Tổng: {totalQuestionsCalculated} câu
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Type 1: Single choice */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-slate-800">1. Trắc nghiệm một đáp án đúng (A, B, C, D)</span>
                  <p className="text-[11px] text-slate-500">Phần I trong cấu trúc chuẩn của Bộ GD&amp;ĐT</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Số câu:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={singleChoiceCount}
                    onChange={(e) => setSingleChoiceCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-center bg-white"
                  />
                </div>
              </div>

              {/* Type 2: Multiple choices */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-slate-800">2. Trắc nghiệm nhiều đáp án đúng</span>
                  <p className="text-[11px] text-slate-500">Có từ 2 đáp án đúng trở lên, hỗ trợ tính điểm từng phần</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Số câu:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={multipleChoiceCount}
                    onChange={(e) => setMultipleChoiceCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-center bg-white"
                  />
                </div>
              </div>

              {/* Type 3: True / False */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-slate-800">3. Câu hỏi Đúng / Sai (nhiều mệnh đề a, b, c, d)</span>
                    <p className="text-[11px] text-slate-500">Phần II trong cấu trúc mới của Bộ GD&amp;ĐT</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Số lượng:</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={trueFalseCount}
                      onChange={(e) => setTrueFalseCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-center bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-slate-200/60 text-[11px]">
                  <span className="font-semibold text-slate-600">Quy cách tính số câu Đúng/Sai:</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tfMode"
                      checked={trueFalseMode === 'per_question'}
                      onChange={() => setTrueFalseMode('per_question')}
                    />
                    <span>Tính theo câu lớn (Mỗi câu gồm 4 mệnh đề)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tfMode"
                      checked={trueFalseMode === 'per_proposition'}
                      onChange={() => setTrueFalseMode('per_proposition')}
                    />
                    <span>Tính theo từng mệnh đề riêng biệt</span>
                  </label>
                </div>
              </div>

              {/* Type 4: Short answer */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-slate-800">4. Câu hỏi trả lời ngắn (Điền số, kết quả)</span>
                  <p className="text-[11px] text-slate-500">Phần III trong cấu trúc mới của Bộ GD&amp;ĐT</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Số câu:</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={shortAnswerCount}
                    onChange={(e) => setShortAnswerCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-center bg-white"
                  />
                </div>
              </div>

              {/* Type 5: Essay */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-slate-800">5. Câu hỏi tự luận</span>
                  <p className="text-[11px] text-slate-500">Trình bày bài giải, chứng minh hoặc đoạn văn nghị luận</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Số câu:</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={essayCount}
                    onChange={(e) => setEssayCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-center bg-white"
                  />
                </div>
              </div>

              {/* Type 6: Matching / Fill */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-slate-800">6. Ghép nối hoặc điền khuyết</span>
                  <p className="text-[11px] text-slate-500">Ghép cặp thuật ngữ, nối sơ đồ hoặc điền từ vào chỗ trống</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Số câu:</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={matchingCount}
                    onChange={(e) => setMatchingCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-center bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Difficulty Distribution Sliders */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">3. Phân bổ tỷ lệ độ khó theo chuẩn GDPT (%)</h3>
              <span className="text-xs font-mono font-bold text-slate-500">
                Tổng: {diffRatio.nhan_biet + diffRatio.thong_hieu + diffRatio.van_dung + diffRatio.van_dung_cao}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="font-bold text-emerald-900">Nhận biết</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={diffRatio.nhan_biet}
                  onChange={(e) => setDiffRatio({ ...diffRatio, nhan_biet: parseInt(e.target.value, 10) || 0 })}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-bold bg-white text-center"
                />
              </div>

              <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100">
                <span className="font-bold text-sky-900">Thông hiểu</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={diffRatio.thong_hieu}
                  onChange={(e) => setDiffRatio({ ...diffRatio, thong_hieu: parseInt(e.target.value, 10) || 0 })}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-sky-200 font-bold bg-white text-center"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                <span className="font-bold text-amber-900">Vận dụng</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={diffRatio.van_dung}
                  onChange={(e) => setDiffRatio({ ...diffRatio, van_dung: parseInt(e.target.value, 10) || 0 })}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-amber-200 font-bold bg-white text-center"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                <span className="font-bold text-rose-900">Vận dụng cao</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={diffRatio.van_dung_cao}
                  onChange={(e) => setDiffRatio({ ...diffRatio, van_dung_cao: parseInt(e.target.value, 10) || 0 })}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-rose-200 font-bold bg-white text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Feasibility Report & Generation Button */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Kiểm tra tính khả thi của ngân hàng
            </h3>

            {isCheckingFeasibility ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Đang đối chiếu số lượng câu hỏi trong kho...
              </div>
            ) : feasibilityReport ? (
              <div className="space-y-3 text-xs">
                {feasibilityReport.isFeasible ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Đủ điều kiện tạo đề thi!</p>
                      <p className="text-[11px] mt-0.5">
                        Kho có sẵn {feasibilityReport.totalAvailable} câu cho môn này (yêu cầu {feasibilityReport.totalRequired} câu).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Ngân hàng chưa đủ số lượng yêu cầu:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                        {feasibilityReport.warnings.map((w: string, i: number) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[10px] text-amber-800">
                        * Hệ thống tuân thủ nguyên tắc không tạo câu hỏi giả hoặc âm thầm giảm số câu. Vui lòng giảm bớt yêu cầu hoặc tải thêm tài liệu.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Constraints Checklist */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={priorityVerifiedOnly}
                  onChange={(e) => setPriorityVerifiedOnly(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Ưu tiên câu hỏi đã kiểm duyệt (Verified)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={allowReusedQuestions}
                  onChange={(e) => setAllowReusedQuestions(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Cho phép dùng lại câu hỏi từ đề thi cũ</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={hasExplanationsInKey}
                  onChange={(e) => setHasExplanationsInKey(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Kèm lời giải chi tiết trong bản đáp án</span>
              </label>
            </div>

            {generationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <b>Không thể tạo đề:</b> {generationError}
              </div>
            )}

            <button
              onClick={handleGenerateExam}
              disabled={isGenerating || (feasibilityReport && !feasibilityReport.isFeasible)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Đang phân bổ ma trận & sinh các mã đề...' : 'Tạo đề thi chính thức'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
