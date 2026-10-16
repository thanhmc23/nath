import React from 'react';
import { History, ShieldCheck, User, Calendar, Clock } from 'lucide-react';

interface AuditLogsViewProps {
  logs: any[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Nhật ký Hoạt động &amp; Lưu vết Hệ thống ({logs.length})
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Ghi lại chi tiết mọi hành vi nhập tài liệu, chỉnh sửa câu hỏi, duyệt điểm và kích hoạt giải đề AI nhằm bảo đảm tính minh bạch.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Hành động</th>
                <th className="py-3 px-4">Người thực hiện</th>
                <th className="py-3 px-4">Chi tiết thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {log.user}
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
