import { Clock, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Exam } from '@/features/user/types/user.type';

type ExamHeaderProps = {
  exam: Exam;
  timeLeft: number;
  isSubmitting: boolean;
  onSubmit: () => void;
};

const ExamHeader = ({ exam, timeLeft, isSubmitting, onSubmit }: ExamHeaderProps) => {
  const navigate = useNavigate();

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{exam.title}</h1>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Final Examination</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xl font-bold ${
            timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'
          }`}>
            <Clock size={20} />
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm shadow-indigo-200 transition-all active:scale-95 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default ExamHeader;