import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  UploadCloud, 
  Search, 
  Trash2,
  Sparkles,
  Info,
  ChevronDown
} from 'lucide-react';
import type { SelectedFile } from '../../types/user.type';
import { userService } from '../../services/user.service';
import { extractApiErrorMessage } from '@/lib/error-utils';
import { useToast } from '@/components/ui/Toast/toast-system';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
const SEMESTER_YEAR_OPTIONS = Array.from({ length: 9 }, (_, index) => String(2026 - index));

const normalizeText = (value?: string): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const SUBJECT_DISPLAY_MAP: Record<string, string> = {
  'toan hoc': 'To\u00e1n h\u1ecdc',
  toan: 'To\u00e1n h\u1ecdc',
  'vat ly': 'V\u1eadt l\u00fd',
  ly: 'V\u1eadt l\u00fd',
  'hoa hoc': 'H\u00f3a h\u1ecdc',
  hoa: 'H\u00f3a h\u1ecdc',
  'sinh hoc': 'Sinh h\u1ecdc',
  sinh: 'Sinh h\u1ecdc',
  'ngu van': 'Ng\u1eef v\u0103n',
  van: 'Ng\u1eef v\u0103n',
  'tieng anh': 'Ti\u1ebfng Anh',
  anh: 'Ti\u1ebfng Anh',
  'lich su': 'L\u1ecbch s\u1eed',
  'dia ly': '\u0110\u1ecba l\u00fd',
  'tin hoc': 'Tin h\u1ecdc',
  gdcd: 'Gi\u00e1o d\u1ee5c c\u00f4ng d\u00e2n',
  'giao duc cong dan': 'Gi\u00e1o d\u1ee5c c\u00f4ng d\u00e2n',
  'cong nghe': 'C\u00f4ng ngh\u1ec7',
  'quoc phong an ninh': 'Qu\u1ed1c ph\u00f2ng an ninh',
  'khoa hoc tu nhien': 'Khoa h\u1ecdc t\u1ef1 nhi\u00ean',
  'khoa hoc xa hoi': 'Khoa h\u1ecdc x\u00e3 h\u1ed9i',
};

const toTitleCase = (text: string): string =>
  text
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatSubjectLabel = (subject: string): string => {
  const raw = subject.replace(/\s+/g, ' ').trim();
  const key = normalizeText(raw);
  return SUBJECT_DISPLAY_MAP[key] ?? toTitleCase(raw);
};

const extractUploadErrorMessage = (error: unknown): string => {
  return extractApiErrorMessage(error, 'Không thể gửi đề thi lên hệ thống. Vui lòng thử lại.');
};

// Component phụ cho phần Tips
const Tip: React.FC<{ text: string }> = ({ text }) => (
  <li className="flex gap-3 text-xs leading-relaxed text-slate-500">
    <span className="text-blue-500 font-bold">•</span>
    <span>{text}</span>
  </li>
);

export default function SubmitExamPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const classOptions = Array.from({ length: 12 }, (_, index) => `L\u1edbp ${index + 1}`);

  // Quản lý State với Type cụ thể
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    semesterYear: SEMESTER_YEAR_OPTIONS[0],
    type: 'final',
    school: '',
    subject: '',
    className: '',
  });

  useEffect(() => {
    const fetchSubjects = async () => {
      const data = await userService.getSubjects();
      const normalized = Array.from(
        new Map(
          data
            .filter((item) => normalizeText(item) !== normalizeText('Tất cả môn học'))
            .map((item) => formatSubjectLabel(item))
            .map((item) => [normalizeText(item), item]),
        ).values(),
      );
      setSubjects(normalized);

      setFormData((prev) => {
        if (prev.subject || normalized.length === 0) {
          return prev;
        }
        return { ...prev, subject: normalized[0] };
      });
    };
    void fetchSubjects();
  }, []);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      toast.warning({
        title: 'Định dạng chưa hỗ trợ',
        message: 'Chỉ hỗ trợ PDF, DOC, DOCX, PNG, JPG, JPEG.',
        duration: 4200,
        showProgress: true,
      });
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.warning({
        title: 'Kích thước quá lớn',
        message: 'File vượt quá 50MB. Vui lòng chọn file nhỏ hơn.',
        duration: 4200,
        showProgress: true,
      });
      return;
    }

    setFileToUpload(file);
    setSelectedFile({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    });
  };

  const handleUpload = async () => {
    if (!formData.title.trim()) {
      toast.warning({
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập tên đề thi.',
        duration: 3600,
        showProgress: true,
      });
      return;
    }

    if (!formData.subject.trim()) {
      toast.warning({
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn môn học trước khi gửi đề.',
        duration: 3600,
        showProgress: true,
      });
      return;
    }

    if (!fileToUpload) {
      toast.warning({
        title: 'Thiếu tệp đính kèm',
        message: 'Vui lòng chọn file trước khi gửi đề.',
        duration: 3600,
        showProgress: true,
      });
      return;
    }

    try {
      setUploading(true);

      await userService.uploadDocument(
        {
          title: formData.title.trim(),
          school: formData.school || undefined,
          subject: formData.subject || undefined,
          semesterYear: formData.semesterYear || undefined,
          type: formData.type || undefined,
          className: formData.className || undefined,
        },
        fileToUpload,
      );

      toast.success({
        title: 'Hệ thống',
        message: 'Đã lưu đề thành công và đang chờ duyệt.',
        duration: 3800,
        showProgress: true,
      });
      setSelectedFile(null);
      setFileToUpload(null);
      setFormData((prev) => ({ ...prev, title: '' }));
    } catch (error) {
      console.error(error);
      toast.error({
        title: 'Cảnh báo hệ thống',
        message: extractUploadErrorMessage(error),
        duration: 6200,
        showProgress: false,
        actionText: 'Thử lại',
        onAction: () => {
          void handleUpload();
        },
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form & Upload */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Card: Exam Details */}
          <section className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-5">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <FileText size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 font-headline">Thông tin đề thi</h2>
            </div>

            <div className="space-y-6">
              <div className="group">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Tên đề thi</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ví dụ: Đề thi cuối kỳ Toán Giải Tích 1 - 2023"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Năm học</label>
                  <div className="relative">
                    <select
                      value={formData.semesterYear}
                      onChange={(e) => setFormData((prev) => ({ ...prev, semesterYear: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 focus:bg-white appearance-none outline-none text-sm cursor-pointer transition-all"
                    >
                      {SEMESTER_YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Loại kỳ thi</label>
                  <div className="relative">
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 focus:bg-white appearance-none outline-none text-sm cursor-pointer transition-all"
                    >
                      <option value="midterm">Giữa kỳ</option>
                      <option value="final">Cuối kỳ</option>
                      <option value="mock">Thi thử</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Trường / Học viện</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    value={formData.school}
                    onChange={(e) => setFormData((prev) => ({ ...prev, school: e.target.value }))}
                    placeholder="Tìm kiếm tên trường..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none text-sm transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Card: File Upload */}
          <section className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
             <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-5">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <UploadCloud size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 font-headline">Tải lên tài liệu</h2>
            </div>

            <div
              onClick={handleChooseFile}
              className="border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-400 transition-all rounded-3xl py-14 flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 z-10">
                <UploadCloud size={32} />
              </div>
              <h3 className="font-bold text-slate-700 z-10">Kéo thả file vào đây</h3>
              <p className="text-xs text-slate-400 mt-2 z-10">Hỗ trợ PDF, DOCX, ảnh (Tối đa 50MB)</p>
              <button
                type="button"
                onClick={handleChooseFile}
                className="mt-6 px-6 py-2 bg-white text-blue-600 font-bold text-xs rounded-full shadow-sm border border-slate-200 hover:shadow-md transition-all z-10"
              >
                Chọn từ máy tính
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {selectedFile && (
              <div className="mt-6 bg-blue-50/50 rounded-2xl p-4 flex items-center gap-4 border border-blue-100/50 animate-in slide-in-from-bottom-2 duration-300">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm font-bold text-[10px]">PDF</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">{selectedFile.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                     <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-full shadow-[0_0_8px_rgba(59,130,246,0.4)]"></div>
                     </div>
                     <p className="text-[10px] text-slate-400 font-medium">{selectedFile.size}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedFile(null);
                    setFileToUpload(null);
                  }}
                  className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Sidebar Actions */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 sticky top-24">
            <h2 className="text-md font-bold text-slate-800 mb-6 font-headline">Phân loại đề</h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block ml-1">Môn học</label>
                <div className="relative">
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/10 outline-none text-sm cursor-pointer appearance-none"
                  >
                    <option value="">Chọn môn học</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block ml-1">Lớp học</label>
                <div className="relative">
                  <select
                    value={formData.className}
                    onChange={(e) => setFormData((prev) => ({ ...prev, className: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/10 outline-none text-sm cursor-pointer appearance-none"
                  >
                    <option value="">Chọn lớp</option>
                    {classOptions.map((classOption) => (
                      <option key={classOption} value={classOption}>
                        {classOption}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 flex gap-3">
                <Sparkles className="text-amber-500 shrink-0" size={18} />
                <div>
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Premium Contributor</p>
                  <p className="text-[11px] text-amber-800/60 leading-relaxed font-medium">Tài liệu của bạn sẽ được ưu tiên duyệt nhanh hơn.</p>
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-4 bg-gradient-to-br from-[#003466] to-[#1a4b84] disabled:opacity-60 text-white font-black rounded-2xl shadow-xl shadow-blue-900/10 hover:shadow-blue-900/20 hover:-translate-y-1 active:scale-[0.98] transition-all text-lg tracking-tight group"
              >
                {uploading ? 'Đang gửi...' : 'Gửi đề thi ngay'}
              </button>

              <button
                onClick={() => navigate('/user/exambank/mysubmit')}
                className="w-full py-3 border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all text-sm"
              >
                Xem bài đã nộp
              </button>

              <div className="pt-4 space-y-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <Info size={16} className="text-blue-500" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider">Lưu ý khi gửi</h3>
                </div>
                <ul className="space-y-3">
                  <Tip text="Ưu tiên file PDF rõ nét." />
                  <Tip text="Nên kèm theo lời giải để nhận thêm credit." />
                  <Tip text="Xóa thông tin cá nhân trên đề thi." />
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

