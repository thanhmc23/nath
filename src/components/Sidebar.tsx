import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Database,
  CheckCircle2,
  FilePlus2,
  FileText,
  GraduationCap,
  Sparkles,
  BookOpen,
  Sliders,
  History,
  Menu,
  X
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'upload'
  | 'questions'
  | 'review'
  | 'generator'
  | 'exams'
  | 'grading'
  | 'templates'
  | 'subjects'
  | 'audit';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  reviewCount: number;
  pendingGradingCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  reviewCount,
  pendingGradingCount,
  isOpen,
  onToggle
}) => {
  const menuItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Tổng quan hệ thống',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'upload' as NavTab,
      label: 'Tải lên & Phân tích',
      icon: UploadCloud,
      badge: null
    },
    {
      id: 'questions' as NavTab,
      label: 'Ngân hàng câu hỏi',
      icon: Database,
      badge: null
    },
    {
      id: 'review' as NavTab,
      label: 'Duyệt câu hỏi mới',
      icon: CheckCircle2,
      badge: reviewCount > 0 ? `${reviewCount}` : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    {
      id: 'generator' as NavTab,
      label: 'Tạo đề thi mới',
      icon: FilePlus2,
      badge: 'Ma trận'
    },
    {
      id: 'exams' as NavTab,
      label: 'Danh sách đề thi',
      icon: FileText,
      badge: null
    },
    {
      id: 'grading' as NavTab,
      label: 'Chấm bài thi & Duyệt',
      icon: GraduationCap,
      badge: pendingGradingCount > 0 ? `${pendingGradingCount}` : null,
      badgeColor: 'bg-rose-500 text-white'
    },
    {
      id: 'templates' as NavTab,
      label: 'Thư viện Template',
      icon: BookOpen,
      badge: null
    },
    {
      id: 'subjects' as NavTab,
      label: 'Quy tắc môn học',
      icon: Sliders,
      badge: null
    },
    {
      id: 'audit' as NavTab,
      label: 'Nhật ký hệ thống',
      icon: History,
      badge: null
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-200 border-r border-slate-800 transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-18 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                AI Exam Bank
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Hệ thống Quản lý &amp; Tạo đề</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Chức năng chính
          </div>
          {menuItems.slice(0, 7).map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (window.innerWidth < 1024) onToggle();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      item.badgeColor || (isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-300')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="px-3 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Cấu hình &amp; Quản trị
          </div>
          {menuItems.slice(7).map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (window.innerWidth < 1024) onToggle();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* User / Engine Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/30">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              GD
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">Bộ GD&ĐT - THPT</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Chuẩn GDPT 2018
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
