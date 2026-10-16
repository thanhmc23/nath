import React from 'react';
import {
  FileText,
  Database,
  CheckCircle2,
  AlertTriangle,
  FilePlus2,
  Sparkles,
  GraduationCap,
  Layers,
  Clock,
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { DashboardStats } from '../types/index.ts';

interface DashboardViewProps {
  stats: DashboardStats | null;
  auditLogs: any[];
  onNavigate: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, auditLogs, onNavigate }) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Tài liệu nguồn đã nạp',
      value: stats.totalDocuments,
      unit: 'tài liệu',
      sub: 'Hỗ trợ PDF, DOCX, TXT, OCR Scan',
      icon: FileText,
      color: 'from-blue-600 to-indigo-600',
      action: () => onNavigate('upload')
    },
    {
      title: 'Tổng số câu hỏi trong kho',
      value: stats.totalQuestions,
      unit: 'câu hỏi',
      sub: `${stats.verifiedQuestions} đã xác minh chính thức`,
      icon: Database,
      color: 'from-indigo-600 to-violet-600',
      action: () => onNavigate('questions')
    },
    {
      title: 'Câu hỏi cần duyệt lại',
      value: stats.needsReviewQuestions,
      unit: 'câu',
      sub: 'Trích xuất tự động từ tài liệu gốc',
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-600',
      action: () => onNavigate('review'),
      alert: stats.needsReviewQuestions > 0
    },
    {
      title: 'Đề thi đã tạo tự động',
      value: stats.totalExams,
      unit: 'bộ đề',
      sub: `Kèm các mã đề 101, 102, 103, 104`,
      icon: FilePlus2,
      color: 'from-emerald-600 to-teal-600',
      action: () => onNavigate('exams')
    },
    {
      title: 'Bài thi đã chấm',
      value: stats.totalGradedSubmissions,
      unit: 'bài nộp',
      sub: `${stats.pendingTeacherReviewSubmissions} bài chờ giáo viên xác nhận`,
      icon: GraduationCap,
      color: 'from-rose-500 to-pink-600',
      action: () => onNavigate('grading'),
      alert: stats.pendingTeacherReviewSubmissions > 0
    },
    {
      title: 'Đề thi đã giải bằng AI',
      value: stats.totalSolvedExams,
      unit: 'bộ đề',
      sub: 'Chế độ giải chi tiết theo yêu cầu',
      icon: Sparkles,
      color: 'from-purple-600 to-fuchsia-600',
      action: () => onNavigate('exams')
    }
  ];

  const questionTypeLabels: Record<string, string> = {
    single_choice: 'Trắc nghiệm 1 lựa chọn',
    multiple_choice: 'Trắc nghiệm nhiều lựa chọn',
    true_false: 'Trắc nghiệm Đúng / Sai (nhiều ý)',
    short_answer: 'Trả lời ngắn',
    essay: 'Tự luận',
    matching_or_fill: 'Ghép nối / Điền khuyết'
  };

  const difficultyLabels: Record<string, { label: string; color: string }> = {
    nhan_biet: { label: 'Nhận biết', color: 'bg-emerald-500' },
    thong_hieu: { label: 'Thông hiểu', color: 'bg-sky-500' },
    van_dung: { label: 'Vận dụng', color: 'bg-amber-500' },
    van_dung_cao: { label: 'Vận dụng cao', color: 'bg-rose-500' }
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-indigo-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Hệ thống Quản lý Ngân hàng Đề thi AI &amp; Tạo đề Tự động
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Số hóa tài liệu, chuẩn hóa câu hỏi và sinh đề thi ma trận
          </h2>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            Hỗ trợ cấu trúc đề thi 3 phần chuẩn GDPT 2018 của Bộ GD&amp;ĐT. Đọc tài liệu PDF, DOCX, ảnh OCR scan thật, phân loại độ khó, phát hiện trùng lặp, giải đề AI theo yêu cầu và chấm bài có giám sát của giáo viên.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Tải tài liệu mới
            </button>
            <button
              onClick={() => onNavigate('generator')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all border border-white/20 cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              Tạo đề thi mới ngay
            </button>
            <button
              onClick={() => onNavigate('questions')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all border border-white/20 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              Khám phá ngân hàng
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.action}
              className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                    {card.title}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {card.value}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{card.unit}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 font-medium">{card.sub}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                <span>Truy cập quản lý</span>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Types Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Phân bố dạng câu hỏi</h3>
            </div>
            <span className="text-xs font-medium text-slate-500">6 dạng câu hỏi chuẩn</span>
          </div>

          <div className="space-y-3.5">
            {Object.entries(questionTypeLabels).map(([key, label]) => {
              const count = (stats.questionsByType as any)[key] || 0;
              const percent = stats.totalQuestions > 0 ? Math.round((count / stats.totalQuestions) * 100) : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{label}</span>
                    <span className="text-slate-500 font-mono">
                      {count} câu ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Difficulty & Quality Health */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Phân bố 4 mức độ khó</h3>
              </div>
              <span className="text-xs font-medium text-slate-500">Chuẩn GDPT</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(difficultyLabels).map(([key, info]) => {
                const count = (stats.questionsByDifficulty as any)[key] || 0;
                const percent = stats.totalQuestions > 0 ? Math.round((count / stats.totalQuestions) * 100) : 0;
                return (
                  <div key={key} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${info.color}`} />
                      <span className="text-xs font-semibold text-slate-700">{info.label}</span>
                    </div>
                    <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
                      {count} <span className="text-xs font-normal text-slate-500">câu</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">{percent}% tổng ngân hàng</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quality Health Status */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                {stats.totalQuestions > 0
                  ? `${Math.round((stats.verifiedQuestions / stats.totalQuestions) * 100)}%`
                  : '0%'}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Tỷ lệ câu hỏi đã kiểm duyệt</h4>
                <p className="text-[11px] text-slate-600">
                  {stats.verifiedQuestions} đã xác minh / {stats.needsReviewQuestions} cần đối chiếu tài liệu gốc
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('review')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Duyệt ngay
            </button>
          </div>
        </div>
      </div>

      {/* Recent Audit Logs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h3 className="font-bold text-slate-900 text-base">Nhật ký hoạt động hệ thống gần đây</h3>
          </div>
          <button
            onClick={() => onNavigate('audit')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Xem toàn bộ nhật ký &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {auditLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-semibold">
                  {log.action}
                </span>
                <span className="font-medium text-slate-800 truncate">{log.details}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 shrink-0">
                <span className="font-medium text-slate-500">{log.user}</span>
                <span>{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
