import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Eye,
  MessageSquareText,
  Trash2,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import type { Submission } from '../../types/user.type';
import { userService } from '../../services/user.service';
import { Pagination } from '@/components/ui/Pagination/pagination';

const SUBMISSIONS_PER_PAGE = 10;

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

const toDisplayText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized && serialized !== '{}' ? serialized : null;
  } catch {
    return String(value);
  }
};

export default function MySubmissionsPage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [openNoteId, setOpenNoteId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(submissions.length / SUBMISSIONS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedSubmissions = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * SUBMISSIONS_PER_PAGE;
    return submissions.slice(startIndex, startIndex + SUBMISSIONS_PER_PAGE);
  }, [submissions, safeCurrentPage]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      const data = await userService.getSubmissions();
      setSubmissions(data);
      setCurrentPage(1);
    };

    void fetchSubmissions();
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="w-full animate-in fade-in duration-500">
      <section className="mb-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <h1 className="mb-3 text-3xl font-black tracking-tight text-[#003466] md:text-4xl">Đề của bạn</h1>
          <p className="text-base leading-relaxed text-slate-500">
            Theo dõi các đề thi bạn đã đóng góp và trạng thái duyệt theo thời gian thực.
          </p>
        </div>

        <div className="flex gap-6 rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-sm">
          <StatItem value={String(submissions.length)} label="Đã gửi" color="text-[#003466]" />
          <div className="h-8 w-px self-center bg-slate-100" />
          <StatItem
            value={String(submissions.filter((item) => item.status === 'Approved').length)}
            label="Đã duyệt"
            color="text-[#006e2f]"
          />
        </div>
      </section>

      <div className="mb-8 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-8 py-5">Tiêu đề đề thi</th>
                <th className="px-6 py-5">Chi tiết</th>
                <th className="px-6 py-5">Loại</th>
                <th className="px-6 py-5">Thời gian</th>
                <th className="px-6 py-5">Trạng thái</th>
                <th className="px-6 py-5">Ghi chú</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pagedSubmissions.map((item) => (
                <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-bold text-[#003466]">{item.title}</div>
                    <div className="text-xs font-medium text-slate-400">{item.university}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-slate-700">{item.year}</div>
                    <div className="text-[11px] text-slate-400">{item.subject}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-slate-500">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-semibold text-slate-700">{item.submittedAt ?? 'Chưa có dữ liệu'}</div>
                    <div className="text-[11px] text-slate-400">Ngày tạo: {item.date}</div>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-5">
                    {toDisplayText(item.note) ? (
                      <div className="relative inline-flex">
                        <button
                          type="button"
                          onClick={() => setOpenNoteId((current) => (current === item.id ? null : item.id))}
                          className={cn(
                            'inline-flex h-9 w-9 items-center justify-center rounded-full border transition',
                            openNoteId === item.id
                              ? 'border-[#003466] bg-blue-50 text-[#003466]'
                              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#003466] hover:bg-blue-50 hover:text-[#003466]'
                          )}
                          title="Xem ghi chú"
                          aria-label={`Xem ghi chú của ${item.title}`}
                        >
                          <MessageSquareText size={16} />
                        </button>
                        {openNoteId === item.id ? (
                          <div className="absolute left-12 top-1/2 z-20 w-72 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xl">
                            <p className="text-sm leading-relaxed text-slate-700">{toDisplayText(item.note)}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition-all group-hover:opacity-100">
                      <RowAction icon={<Eye size={18} />} onClick={() => navigate(`/user/comment/${item.id}`)} />
                      <RowAction icon={<Trash2 size={18} />} isDelete />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {submissions.length > 0 && totalPages > 1 && (
        <div className="mb-8 flex justify-center">
          <Pagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {submissions.length === 0 && (
        <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-500">
          Bạn chưa có bài nộp nào. Hãy tải đề đầu tiên của bạn.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col items-center justify-between rounded-3xl bg-gradient-to-br from-[#003466] to-[#1a4b84] p-8 text-white shadow-lg shadow-blue-900/10 md:flex-row">
          <div className="max-w-md">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="text-yellow-400" size={18} />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Cột mốc đóng góp</span>
            </div>
            <h3 className="mb-2 text-2xl font-bold">Tiến độ đóng góp</h3>
            <p className="text-sm leading-relaxed text-blue-100/70">
              Bạn chỉ cần thêm{' '}
              <span className="font-bold text-white underline decoration-green-400 underline-offset-4">5 tài liệu duyệt</span>{' '}
              nữa để lên hạng.
            </p>
          </div>
          <div className="relative mt-6 flex h-24 w-24 shrink-0 items-center justify-center md:mt-0">
            <svg className="h-full w-full -rotate-90">
              <circle cx="48" cy="48" r="42" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="transparent"
                stroke="#4ae176"
                strokeWidth="6"
                strokeDasharray="264"
                strokeDashoffset="74"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-lg font-black">72%</span>
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-3xl border border-slate-200/50 bg-slate-100/50 p-8">
          <Sparkles className="mb-4 text-[#003466]" size={24} />
          <h4 className="mb-2 font-bold text-[#003466]">Mẹo nâng chất lượng</h4>
          <p className="text-xs leading-relaxed text-slate-500">
            Các bản scan có kèm <span className="font-bold text-slate-800">lời giải chi tiết</span> luôn có tỷ lệ duyệt cao hơn 90%.
          </p>
        </div>
      </div>

      <button
        onClick={() => navigate('/user/exambank/submit')}
        className="fixed bottom-8 right-8 z-40 flex items-center gap-2 rounded-full bg-[#003466] px-6 py-4 text-white shadow-2xl ring-4 ring-white/50 transition-all hover:scale-105 active:scale-95"
      >
        <PlusCircle size={20} />
        <span className="text-sm font-bold">Tải đề mới</span>
      </button>
    </div>
  );
}

const StatItem = ({ value, label, color }: { value: string; label: string; color: string }) => (
  <div className="text-center">
    <div className={cn('text-2xl font-black tracking-tighter', color)}>{value}</div>
    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</div>
  </div>
);

const StatusBadge = ({ status }: { status: Submission['status'] }) => {
  const configs = {
    Approved: { dot: 'bg-green-500', bg: 'bg-green-50 text-green-700' },
    Pending: { dot: 'bg-orange-400', bg: 'bg-orange-50 text-orange-700' },
    Rejected: { dot: 'bg-red-500', bg: 'bg-red-50 text-red-700' },
  };
  const config = configs[status];

  return (
    <div className={cn('inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-0.5', config.bg)}>
      <div className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      <span className="text-[10px] font-black uppercase tracking-tight">{status}</span>
    </div>
  );
};

const RowAction = ({ icon, isDelete, onClick }: { icon: React.ReactNode; isDelete?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      'rounded-lg p-2 transition-all',
      isDelete ? 'text-slate-300 hover:bg-red-50 hover:text-red-600' : 'text-slate-300 hover:bg-blue-50 hover:text-blue-600'
    )}
  >
    {icon}
  </button>
);
