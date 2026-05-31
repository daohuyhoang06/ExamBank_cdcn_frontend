import type { Exam } from '@/features/user/types/user.type';

type ExamSidebarProps = {
  exam: Exam;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  userAnswers: Record<number, unknown>;
};

const ExamSidebar = ({ exam, currentIndex, setCurrentIndex, userAnswers }: ExamSidebarProps) => {
  const answeredCount = Object.keys(userAnswers).length;
  const completionPercent = Math.max(0, Math.min(100, (answeredCount / exam.questions.length) * 100));

  return (
    <aside className="w-full lg:w-80">
      <div className="sticky top-6 rounded-xl bg-[#f2f4f6] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-[var(--font-label)] font-bold text-[#191c1e]">Tiến độ làm bài</h3>
          <span className="text-sm font-bold text-[#006e2f]">
            {answeredCount}/{exam.questions.length} câu
          </span>
        </div>

        <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-[#e0e3e5]">
          <div
            className="h-full rounded-full bg-[#006e2f] shadow-[0_0_8px_rgba(0,110,47,0.3)]"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-5 gap-2">
          {exam.questions.map((_, idx) => {
            const isCurrent = currentIndex === idx;
            const isDone = userAnswers[idx] !== undefined;

            if (isCurrent) {
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className="z-10 aspect-square w-full scale-110 rounded-lg bg-[#d5e3ff] text-xs font-black text-[#003466] ring-2 ring-[#003466]"
                >
                  {idx + 1}
                </button>
              );
            }

            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`aspect-square w-full rounded-lg text-xs font-bold transition-colors ${
                  isDone
                    ? 'bg-[#006e2f] text-white'
                    : 'bg-[#e0e3e5] text-[#424750] hover:bg-[#d5e3ff]'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="mt-8 space-y-3 border-t border-slate-200/70 pt-6">
          <div className="flex items-center gap-3 text-xs">
            <div className="h-3 w-3 rounded bg-[#006e2f]" />
            <span className="text-slate-500">Đã trả lời</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="h-3 w-3 rounded bg-[#e0e3e5]" />
            <span className="text-slate-500">Chưa trả lời</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="h-3 w-3 rounded bg-[#d5e3ff] ring-1 ring-[#003466]" />
            <span className="text-slate-500">Câu đang chọn</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ExamSidebar;
