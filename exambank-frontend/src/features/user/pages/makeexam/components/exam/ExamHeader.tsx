import { Clock } from 'lucide-react';
import type { Exam } from '@/features/user/types/user.type';

type ExamHeaderProps = {
  exam: Exam;
  timeLeft: number;
  isSubmitting: boolean;
  onSubmit: () => void;
};

const ExamHeader = ({ exam, timeLeft, isSubmitting, onSubmit }: ExamHeaderProps) => {
  const formatTime = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="line-clamp-1 min-w-0 font-[var(--font-label)] text-lg font-extrabold tracking-tight text-[#003466] md:text-xl">
            {exam.title}
          </h1>
        </div>

        <div className="flex w-full items-center justify-end gap-4 sm:w-auto sm:gap-6">
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-sm font-bold tabular-nums md:text-base ${
              timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-[#f2f4f6] text-[#003466]'
            }`}
          >
            <Clock size={18} />
            {formatTime(timeLeft)}
          </div>

          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="rounded-md bg-gradient-to-br from-[#003466] to-[#1a4b84] px-6 py-2 text-sm font-bold text-white transition-all duration-300 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 md:text-base"
          >
            {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default ExamHeader;
