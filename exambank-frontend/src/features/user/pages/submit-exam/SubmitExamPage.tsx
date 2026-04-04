import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Search, 
  CheckCircle2, 
  Trash2,
  Sparkles,
  Info,
  ChevronDown
} from 'lucide-react';
import type { SelectedFile } from '../../types/user.type';
import { userService } from '../../services/user.service';

// Component phụ cho phần Tips
const Tip: React.FC<{ text: string }> = ({ text }) => (
  <li className="flex gap-3 text-xs leading-relaxed text-slate-500">
    <span className="text-blue-500 font-bold">•</span>
    <span>{text}</span>
  </li>
);

export default function SubmitExamPage() {
  // Quản lý State với Type cụ thể
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [difficulty, setDifficulty] = useState<'Dễ' | 'Vừa' | 'Khó'>('Vừa');

  useEffect(() => {
    const fetchSelectedFile = async () => {
      const file = await userService.getSelectedFile();
      setSelectedFile(file);
    };
    fetchSelectedFile();
  }, []);

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      {/* Success Notification Banner */}
      <div className="mb-8 flex items-center gap-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl shadow-sm">
        <div className="flex-shrink-0 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200">
          <CheckCircle2 size={22} />
        </div>
        <div>
          <p className="text-emerald-900 font-bold text-sm">Đề thi đã được gửi để phê duyệt</p>
          <p className="text-emerald-700/70 text-xs">Cảm ơn bạn đã đóng góp cho cộng đồng học thuật của chúng tôi.</p>
        </div>
      </div>

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
                  placeholder="Ví dụ: Đề thi cuối kỳ Toán Giải Tích 1 - 2023"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Năm học</label>
                  <div className="relative">
                    <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 focus:bg-white appearance-none outline-none text-sm cursor-pointer transition-all">
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">Loại kỳ thi</label>
                  <div className="relative">
                    <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 focus:bg-white appearance-none outline-none text-sm cursor-pointer transition-all">
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

            <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-400 transition-all rounded-3xl py-14 flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden">
              <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 z-10">
                <UploadCloud size={32} />
              </div>
              <h3 className="font-bold text-slate-700 z-10">Kéo thả file vào đây</h3>
              <p className="text-xs text-slate-400 mt-2 z-10">Hỗ trợ PDF, JPG, PNG (Tối đa 20MB)</p>
              <button className="mt-6 px-6 py-2 bg-white text-blue-600 font-bold text-xs rounded-full shadow-sm border border-slate-200 hover:shadow-md transition-all z-10">
                Chọn từ máy tính
              </button>
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
                  onClick={() => setSelectedFile(null)}
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
                  <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/10 outline-none text-sm cursor-pointer appearance-none">
                    <option value="math">Toán học</option>
                    <option value="physics">Vật lý</option>
                    <option value="chemistry">Hóa học</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 block ml-1">Độ khó ước tính</label>
                <div className="flex gap-2">
                  {(['Dễ', 'Vừa', 'Khó'] as const).map((lv) => (
                    <button
                      key={lv}
                      onClick={() => setDifficulty(lv)}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all border ${
                        difficulty === lv 
                        ? 'bg-[#1a4b84] border-[#1a4b84] text-white shadow-lg shadow-blue-900/20' 
                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 flex gap-3">
                <Sparkles className="text-amber-500 shrink-0" size={18} />
                <div>
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Premium Contributor</p>
                  <p className="text-[11px] text-amber-800/60 leading-relaxed font-medium">Tài liệu của bạn sẽ được ưu tiên duyệt nhanh hơn.</p>
                </div>
              </div>

              <button className="w-full py-4 bg-gradient-to-br from-[#003466] to-[#1a4b84] text-white font-black rounded-2xl shadow-xl shadow-blue-900/10 hover:shadow-blue-900/20 hover:-translate-y-1 active:scale-[0.98] transition-all text-lg tracking-tight group">
                Gửi đề thi ngay
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