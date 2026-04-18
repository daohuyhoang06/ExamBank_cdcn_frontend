import {  Info } from 'lucide-react';
import type { Exam } from '@/features/user/types/user.type';

type ExamSidebarProps = {
  exam: Exam;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  userAnswers: Record<number, unknown>;
};

const ExamSidebar = ({ exam, currentIndex, setCurrentIndex, userAnswers }: ExamSidebarProps) => {
  const answeredCount = Object.keys(userAnswers).length;
  const completionPercent = (answeredCount / exam.questions.length) * 100;

  return (
    <aside className="w-full flex flex-col gap-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Tiến độ</h3>
            <div className="text-2xl font-black text-slate-900">
              {answeredCount}<span className="text-slate-300 mx-1">/</span>{exam.questions.length}
            </div>
          </div>
          <div className="text-right">
            <span className="text-indigo-600 font-bold">{Math.round(completionPercent)}%</span>
          </div>
        </div>
        
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-8">
          <div 
            className="h-full bg-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-5 gap-2">
          {exam.questions.map((_, idx: number) => {
            const isCurrent = currentIndex === idx;
            const isDone = userAnswers[idx] !== undefined;

            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-10 rounded-xl font-bold text-sm transition-all relative ${
                  isCurrent 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-offset-2 ring-indigo-600' 
                    : isDone 
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100 border' 
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-indigo-900 p-6 rounded-3xl text-white overflow-hidden relative">
        <div className="relative z-10">
          <Info size={20} className="mb-2 opacity-80" />
          <p className="text-sm font-medium opacity-90">Đừng quên kiểm tra lại các câu hỏi khó trước khi nộp bài!</p>
        </div>
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
      </div>
    </aside>
  );
};

export default ExamSidebar;