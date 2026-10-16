import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  FileCheck,
  AlertCircle,
  Trash2,
  RefreshCw,
  Sparkles,
  Eye,
  CheckCircle2,
  FileCode,
  ScanLine,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api.ts';
import { SourceDocument, SubjectRule, Question } from '../types/index.ts';
import { MathRenderer } from '../components/MathRenderer.tsx';

interface UploadViewProps {
  documents: SourceDocument[];
  subjects: SubjectRule[];
  onRefresh: () => void;
  onNavigate: (tab: any) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  documents,
  subjects,
  onRefresh,
  onNavigate
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('sub-toan');
  const [isScanMode, setIsScanMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Quick sample test documents for instant testing without needing external files!
  const [rawTextInput, setRawTextInput] = useState<string>('');
  const [fileNameInput, setFileNameInput] = useState<string>('');

  // Latest extraction report
  const [latestReport, setLatestReport] = useState<{
    document: SourceDocument;
    extractedCount: number;
    questions: Question[];
    summary: string;
  } | null>(null);

  const sampleDeThi = `BỘ GIÁO DỤC VÀ ĐÀO TẠO
ĐỀ THI KHẢO SÁT CHẤT LƯỢNG MÔN TOÁN LỚP 12
Thời gian làm bài: 90 phút

PHẦN I. Thí sinh trả lời từ câu 1 đến câu 2. Mỗi câu hỏi thí sinh chỉ chọn một phương án.
Câu 1. Cho hàm số y = f(x) có đồ thị như hình vẽ. Điểm cực đại của đồ thị hàm số là:
A. (1; 3)
B. (-1; 2)
C. (0; 1)
D. (2; -1)
Đáp án: A
Lời giải: Quan sát đồ thị tại x = 1 hàm số đạt cực đại với y = 3.

Câu 2. Cho tứ diện OABC có OA, OB, OC đôi một vuông góc. Biết OA = 1, OB = 2, OC = 3. Thể tích khối tứ diện OABC là:
A. 1
B. 2
C. 3
D. 6
Đáp án: A
Lời giải: Thể tích V = 1/6 * OA * OB * OC = 1/6 * 1 * 2 * 3 = 1.

PHẦN II. Câu trắc nghiệm Đúng/Sai. Thí sinh trả lời câu 3.
Câu 3. Trong không gian Oxyz, cho mặt cầu (S): (x - 1)^2 + (y + 2)^2 + (z - 3)^2 = 16.
a) Tâm của mặt cầu (S) là I(1; -2; 3).
b) Bán kính của mặt cầu (S) là R = 16.
c) Điểm M(1; -2; 7) thuộc mặt cầu (S).
d) Mặt cầu (S) tiếp xúc với mặt phẳng (Oxy).
Đáp án: a: Đúng, b: Sai, c: Đúng, d: Sai.
Lời giải: Bán kính R = sqrt(16) = 4. Khoảng cách d(I, Oxy) = |z_I| = 3 != 4 nên không tiếp xúc.

PHẦN III. Câu trắc nghiệm trả lời ngắn.
Câu 4. Một ngọn hải đăng đặt tại vị trí A cách bờ biển một khoảng AB = 4 km. Trên bờ biển có một kho hàng C cách B một khoảng 8 km. Một người chèo thuyền từ A đến M trên bờ biển (M nằm giữa B và C) với vận tốc 4 km/h rồi đi bộ từ M đến C với vận tốc 6 km/h. Thời gian ngắn nhất để người đó đi từ A đến C là bao nhiêu giờ? (Làm tròn đến chữ số thập phân thứ hai).
Đáp án: 2.15
Lời giải: Đặt BM = x (0 <= x <= 8). Quãng đường AM = sqrt(x^2 + 16). Tổng thời gian T(x) = sqrt(x^2+16)/4 + (8-x)/6. Tìm cực trị ta được min xấp xỉ 2.15 giờ.`;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsProcessing(true);
    setProgress(15);
    setStatusMessage('Đang nạp file và phân tích nội dung...');

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const resultStr = reader.result as string;
        let base64Data = '';
        let textContent = '';

        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
          // split "data:image/png;base64,...."
          base64Data = resultStr.split(',')[1] || resultStr;
        } else {
          textContent = resultStr;
        }

        setProgress(40);
        setStatusMessage(
          isScanMode
            ? 'Đang thực hiện nhận diện quang học (OCR) đa phương thức...'
            : 'Đang phân đoạn cấu trúc câu hỏi, phương án và bảng đáp án...'
        );

        const currentSubject = subjects.find((s) => s.id === selectedSubject);

        const res = await api.uploadAndAnalyze({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
          text: textContent,
          base64Data,
          mimeType: file.type,
          isScan: isScanMode,
          subjectHint: currentSubject?.name
        });

        setProgress(100);
        setStatusMessage('Hoàn tất trích xuất và chuẩn hóa vào ngân hàng câu hỏi!');
        setLatestReport(res);
        onRefresh();
      } catch (err: any) {
        console.error(err);
        setUploadError(err.message || 'Lỗi khi xử lý file');
      } finally {
        setIsProcessing(false);
      }
    };

    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleProcessRawText = async () => {
    if (!rawTextInput.trim()) {
      setUploadError('Vui lòng dán nội dung văn bản đề thi hoặc chọn đề mẫu');
      return;
    }

    setUploadError(null);
    setIsProcessing(true);
    setProgress(30);
    setStatusMessage('Đang đọc văn bản và trích xuất câu hỏi...');

    try {
      const fileName = fileNameInput.trim() || `De_Thi_Nhap_Lieu_${Date.now().toString().slice(-4)}.txt`;
      const currentSubject = subjects.find((s) => s.id === selectedSubject);

      const res = await api.uploadAndAnalyze({
        fileName,
        fileSize: new Blob([rawTextInput]).size,
        fileType: 'text/plain',
        text: rawTextInput,
        isScan: false,
        subjectHint: currentSubject?.name
      });

      setProgress(100);
      setStatusMessage('Đã phân tích thành công!');
      setLatestReport(res);
      onRefresh();
    } catch (err: any) {
      setUploadError(err.message || 'Không thể phân tích nội dung');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài liệu này khỏi danh sách quản lý?')) {
      await api.deleteDocument(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Tải lên và Phân tích Tài liệu Đề thi
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Hệ thống AI tự động đọc cấu trúc đề thi, trích xuất từng câu hỏi, phương án, đáp án và đưa vào kho kiểm duyệt.
        </p>
      </div>

      {/* Main Upload Box & Config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dropzone & Fast Paste */}
        <div className="lg:col-span-2 space-y-4">
          {/* Config row */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Môn học mục tiêu:</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isScanMode}
                  onChange={(e) => setIsScanMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-2 text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <ScanLine className="w-3.5 h-3.5 text-indigo-600" />
                  Chế độ OCR Scan
                </span>
              </label>
            </div>
          </div>

          {/* File Dropzone */}
          <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-2xl p-8 text-center transition-colors group cursor-pointer">
            <input
              type="file"
              multiple={false}
              accept=".pdf,.docx,.doc,.txt,image/*"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Kéo thả tài liệu vào đây hoặc <span className="text-indigo-600 underline">chọn tệp từ máy tính</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Hỗ trợ định dạng <b>PDF (văn bản &amp; scan)</b>, <b>Word DOCX</b>, <b>TXT</b> và <b>Hình ảnh JPG/PNG</b> chứa đề thi.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                <span>Dung lượng hỗ trợ tối đa 50MB</span>
                <span>•</span>
                <span>Tự động nhận diện công thức LaTeX &amp; hóa học</span>
              </div>
            </div>
          </div>

          {/* Direct Text Paste Option */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">Hoặc dán trực tiếp văn bản đề thi</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRawTextInput(sampleDeThi);
                  setFileNameInput('De_Thi_Khao_Sat_Toan_Lop_12_Chuan.txt');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                + Sử dụng đề mẫu GDPT 2018
              </button>
            </div>

            <input
              type="text"
              placeholder="Tên tài liệu gợi nhớ (ví dụ: De_Kiem_Tra_Gk1_Toan12.txt)..."
              value={fileNameInput}
              onChange={(e) => setFileNameInput(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            />

            <textarea
              rows={5}
              placeholder="Dán toàn bộ nội dung đề thi, câu hỏi, các đáp án A B C D hoặc lời giải vào đây..."
              value={rawTextInput}
              onChange={(e) => setRawTextInput(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 leading-relaxed"
            />

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleProcessRawText}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isProcessing ? 'Đang trích xuất câu hỏi...' : 'Phân tích &amp; Nhập vào ngân hàng'}
              </button>
            </div>
          </div>

          {/* Progress & Error Alerts */}
          {isProcessing && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  {statusMessage}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {uploadError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Không thể hoàn thành xử lý:</p>
                <p className="mt-0.5">{uploadError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Guidelines & Quality Standards */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Quy chuẩn trích xuất chất lượng cao
            </h4>
            <ul className="text-xs text-slate-600 space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>
                  <b>Giữ nguyên tính chân thực:</b> Không tự ý bịa đáp án nếu đề không có lời giải.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span>
                  <b>Bảo tồn công thức Toán / Lý / Hóa:</b> Xuất chuẩn LaTeX <code>$...$</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>
                  <b>Hàng đợi kiểm tra:</b> Câu hỏi mới tải lên được đánh dấu <code>extracted</code> để giáo viên duyệt trước khi tạo đề.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <span>
                  <b>Đối chiếu nguồn:</b> Từng câu hỏi lưu chính xác tên tài liệu và vị trí xuất hiện.
                </span>
              </li>
            </ul>
          </div>

          {/* Quick Stats on Uploaded Files */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Thống kê tài liệu đã nạp
            </h4>
            <div className="text-2xl font-extrabold font-mono text-indigo-400">
              {documents.length} <span className="text-sm text-slate-400 font-sans font-normal">tài liệu</span>
            </div>
            <p className="text-xs text-slate-300">
              Tổng số câu hỏi đã được số hóa từ các tài liệu này: {' '}
              <b className="text-white">
                {documents.reduce((acc, d) => acc + (d.extractedQuestionsCount || 0), 0)}
              </b>{' '}
              câu.
            </p>
          </div>
        </div>
      </div>

      {/* Latest Extraction Result Preview */}
      {latestReport && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-base">Báo cáo trích xuất thành công</h3>
            </div>
            <button
              onClick={() => onNavigate('review')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Xem &amp; Duyệt {latestReport.extractedCount} câu hỏi vừa trích xuất
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-emerald-800 font-medium">{latestReport.summary}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2">
            {latestReport.questions.slice(0, 4).map((q, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-xl border border-emerald-200/80 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{q.sourcePosition || `Câu ${idx + 1}`}</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                    {q.questionType}
                  </span>
                </div>
                <div className="text-slate-700 line-clamp-2">
                  <MathRenderer content={q.content} />
                </div>
                {q.correctAnswers && q.correctAnswers.length > 0 && (
                  <div className="text-emerald-700 font-semibold text-[11px]">
                    Đáp án trích xuất: {q.correctAnswers.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Documents Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Danh sách tài liệu đã tải lên ({documents.length})</h3>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Chưa có tài liệu nào được tải lên. Hãy tải file PDF hoặc DOCX để bắt đầu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tên tài liệu</th>
                  <th className="py-3 px-4">Định dạng</th>
                  <th className="py-3 px-4">Dung lượng</th>
                  <th className="py-3 px-4">Số câu trích xuất</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate max-w-xs">{doc.fileName}</span>
                      {doc.isScan && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">
                          SCAN
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {doc.fileType.includes('pdf')
                        ? 'PDF'
                        : doc.fileType.includes('word') || doc.fileType.includes('officedocument')
                        ? 'DOCX'
                        : 'TEXT'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-600 font-mono">
                      {doc.extractedQuestionsCount} câu
                    </td>
                    <td className="py-3 px-4">
                      {doc.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Hoàn tất
                        </span>
                      ) : doc.status === 'processing' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Đang xử lý
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3" />
                          Lỗi
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
