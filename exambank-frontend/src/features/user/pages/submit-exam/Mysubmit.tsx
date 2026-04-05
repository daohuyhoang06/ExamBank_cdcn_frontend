import React, { useEffect, useState } from 'react';
import { 

  Trophy, 
  Eye, 
  Trash2, 
  PlusCircle, 
  Sparkles, 
} from 'lucide-react';
import type{ Submission } from '../../types/user.type';
import { userService } from '../../services/user.service';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      const data = await userService.getSubmissions();
      setSubmissions(data);
    };
    fetchSubmissions();
  }, []);

  return (
    <div className="w-full animate-in fade-in duration-500">
      {/* 1. Header Section - Chỉ giữ nội dung tiêu đề */}
      <section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-black text-[#003466] tracking-tight mb-3">My Submissions</h1>
          <p className="text-slate-500 text-base leading-relaxed">
            Review your academic contributions and monitor their approval status in real-time.
          </p>
        </div>
        
        {/* Stats nhỏ gọn bên phải */}
        <div className="flex gap-6 bg-white shadow-sm border border-slate-100 px-6 py-4 rounded-2xl">
          <StatItem value="14" label="Shared" color="text-[#003466]" />
          <div className="w-px bg-slate-100 h-8 self-center" />
          <StatItem value="11" label="Approved" color="text-[#006e2f]" />
        </div>
      </section>

      {/* 2. Main Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50/50 text-[11px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Exam Title</th>
                <th className="px-6 py-5">Details</th>
                <th className="px-6 py-5">Type</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {submissions.map((item) => (
                <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-bold text-[#003466]">{item.title}</div>
                    <div className="text-xs text-slate-400 font-medium">{item.university}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-bold text-slate-700 text-sm">{item.year}</div>
                    <div className="text-[11px] text-slate-400">{item.subject}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black uppercase tracking-tight">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={item.status} reason={item.reason} />
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <RowAction icon={<Eye size={18} />} />
                      <RowAction icon={<Trash2 size={18} />} isDelete />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Bottom Cards - Milestone & Tip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-[#003466] to-[#1a4b84] rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg shadow-blue-900/10">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="text-yellow-400" size={18} />
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">Milestone Path</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">Vault Keeper Progress</h3>
            <p className="text-blue-100/70 text-sm leading-relaxed">
              Bạn chỉ cần thêm <span className="text-white font-bold underline underline-offset-4 decoration-green-400">5 tài liệu duyệt</span> nữa để lên hạng.
            </p>
          </div>
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0 mt-6 md:mt-0">
            <svg className="w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="42" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle cx="48" cy="48" r="42" fill="transparent" stroke="#4ae176" strokeWidth="6" strokeDasharray="264" strokeDashoffset="74" strokeLinecap="round" />
            </svg>
            <span className="absolute text-lg font-black">72%</span>
          </div>
        </div>

        <div className="bg-slate-100/50 rounded-3xl p-8 border border-slate-200/50 flex flex-col justify-center">
          <Sparkles className="text-[#003466] mb-4" size={24} />
          <h4 className="font-bold text-[#003466] mb-2">Pro Quality Tip</h4>
          <p className="text-slate-500 text-xs leading-relaxed">
            Các bản scan có kèm <span className="font-bold text-slate-800">lời giải chi tiết</span> luôn có tỉ lệ duyệt cao hơn 90%.
          </p>
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <button className="fixed bottom-8 right-8 flex items-center gap-2 bg-[#003466] text-white px-6 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all z-40 ring-4 ring-white/50">
        <PlusCircle size={20} />
        <span className="font-bold text-sm">New Submission</span>
      </button>
    </div>
  );
}

/**
 * SUB-COMPONENTS (Keep them simple)
 */

const StatItem = ({ value, label, color }: { value: string; label: string; color: string }) => (
  <div className="text-center">
    <div className={cn("text-2xl font-black tracking-tighter", color)}>{value}</div>
    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
  </div>
);

const StatusBadge = ({ status, reason }: { status: Submission['status']; reason?: string }) => {
  const configs = {
    Approved: { dot: "bg-green-500", bg: "bg-green-50 text-green-700" },
    Pending: { dot: "bg-orange-400", bg: "bg-orange-50 text-orange-700" },
    Rejected: { dot: "bg-red-500", bg: "bg-red-50 text-red-700" },
  };
  const config = configs[status];
  return (
    <div className="flex flex-col gap-1">
      <div className={cn("inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full w-fit", config.bg)}>
        <div className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
        <span className="text-[10px] font-black uppercase tracking-tight">{status}</span>
      </div>
      {reason && <span className="text-[9px] text-red-400 font-bold ml-1 italic">{reason}</span>}
    </div>
  );
};

const RowAction = ({ icon, isDelete }: { icon: React.ReactNode; isDelete?: boolean }) => (
  <button className={cn(
    "p-2 rounded-lg transition-all",
    isDelete ? "text-slate-300 hover:text-red-600 hover:bg-red-50" : "text-slate-300 hover:text-blue-600 hover:bg-blue-50"
  )}>
    {icon}
  </button>
);