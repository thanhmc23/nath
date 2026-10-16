import React, { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  Sparkles,
  Bell,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { UploadView } from './views/UploadView.tsx';
import { QuestionsView } from './views/QuestionsView.tsx';
import { ReviewQueueView } from './views/ReviewQueueView.tsx';
import { ExamGeneratorView } from './views/ExamGeneratorView.tsx';
import { ExamsView } from './views/ExamsView.tsx';
import { GradingCenterView } from './views/GradingCenterView.tsx';
import { TemplatesView } from './views/TemplatesView.tsx';
import { SubjectRulesView } from './views/SubjectRulesView.tsx';
import { AuditLogsView } from './views/AuditLogsView.tsx';
import { api } from './services/api.ts';
import {
  DashboardStats,
  Question,
  SourceDocument,
  SubjectRule,
  ExamTemplate,
  Exam,
  ExamSubmission
} from './types/index.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Core Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [subjects, setSubjects] = useState<SubjectRule[]>([]);
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(undefined);

  const loadAllData = useCallback(async () => {
    try {
      const [
        statsData,
        questionsData,
        docsData,
        subjectsData,
        templatesData,
        examsData,
        submissionsData,
        logsData
      ] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getQuestions().catch(() => []),
        api.getDocuments().catch(() => []),
        api.getSubjects().catch(() => []),
        api.getTemplates().catch(() => []),
        api.getExams().catch(() => []),
        api.getSubmissions().catch(() => []),
        api.getAuditLogs().catch(() => [])
      ]);

      if (statsData) setStats(statsData);
      setQuestions(questionsData);
      setDocuments(docsData);
      setSubjects(subjectsData);
      setTemplates(templatesData);
      setExams(examsData);
      setSubmissions(submissionsData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error('Error loading app data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const reviewQuestionsCount = questions.filter(
    (q) => q.verificationStatus === 'extracted' || q.verificationStatus === 'needs_review'
  ).length;

  const pendingGradingCount = submissions.filter(
    (s) => s.grading_status === 'needs_teacher_review'
  ).length;

  const handleExamCreated = (newExam: Exam) => {
    setExams((prev) => [newExam, ...prev]);
    setSelectedExamId(newExam.id);
    setCurrentTab('exams');
    loadAllData();
  };

  const handleApplyTemplate = (templateId: string) => {
    setCurrentTab('generator');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        reviewCount={reviewQuestionsCount}
        pendingGradingCount={pendingGradingCount}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-18 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Hệ thống Quản lý Ngân hàng Đề thi AI
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {currentTab === 'dashboard' && 'Bảng điều khiển Tổng quan'}
                {currentTab === 'upload' && 'Tải lên & Phân tích Tài liệu'}
                {currentTab === 'questions' && 'Ngân hàng Câu hỏi Chuẩn hóa'}
                {currentTab === 'review' && 'Kiểm duyệt Câu hỏi Mới'}
                {currentTab === 'generator' && 'Tạo Đề thi theo Ma trận'}
                {currentTab === 'exams' && 'Danh sách Đề thi & Xuất file'}
                {currentTab === 'grading' && 'Trung tâm Chấm bài & Duyệt điểm'}
                {currentTab === 'templates' && 'Thư viện Template Cấu trúc'}
                {currentTab === 'subjects' && 'Cấu hình Quy tắc theo Môn học'}
                {currentTab === 'audit' && 'Nhật ký Hoạt động Hệ thống'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => loadAllData()}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Chuẩn GDPT 2018</span>
            </div>

            <button
              onClick={() => setCurrentTab('review')}
              className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Thông báo câu hỏi cần duyệt"
            >
              <Bell className="w-4 h-4" />
              {reviewQuestionsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Đang khởi tạo hệ thống và nạp dữ liệu...</p>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  stats={stats}
                  auditLogs={auditLogs}
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'upload' && (
                <UploadView
                  documents={documents}
                  subjects={subjects}
                  onRefresh={loadAllData}
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'questions' && (
                <QuestionsView
                  questions={questions}
                  subjects={subjects}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'review' && (
                <ReviewQueueView
                  questions={questions}
                  onRefresh={loadAllData}
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'generator' && (
                <ExamGeneratorView
                  subjects={subjects}
                  templates={templates}
                  onExamCreated={handleExamCreated}
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'exams' && (
                <ExamsView
                  exams={exams}
                  selectedExamId={selectedExamId}
                  onRefresh={loadAllData}
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'grading' && (
                <GradingCenterView
                  exams={exams}
                  submissions={submissions}
                  onRefresh={loadAllData}
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'templates' && (
                <TemplatesView
                  templates={templates}
                  subjects={subjects}
                  onRefresh={loadAllData}
                  onApplyTemplate={handleApplyTemplate}
                />
              )}

              {currentTab === 'subjects' && (
                <SubjectRulesView
                  subjects={subjects}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'audit' && (
                <AuditLogsView logs={auditLogs} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
