import { CheckCircle2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { Question } from '@/features/user/types/user.type';

type QuestionRendererProps = {
  question: Question;
  index: number;
  userAnswers: Record<number, unknown>;
  setUserAnswers: Dispatch<SetStateAction<Record<number, unknown>>>;
};

const QuestionRenderer = ({ question, index, userAnswers, setUserAnswers }: QuestionRendererProps) => {
  const answer = userAnswers[index];

  const handleSelect = (val: unknown) => {
    setUserAnswers((prev) => ({ ...prev, [index]: val }));
  };

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {question.options.map((opt: string, idx: number) => {
            const isSelected = answer === idx;

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`group relative flex items-center rounded-xl p-5 text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-100 ring-2 ring-[#003466]/40'
                    : 'bg-[#eceef0] hover:bg-[#e0e3e5]'
                }`}
              >
                <span
                  className={`mr-4 flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                    isSelected ? 'bg-[#003466] text-white' : 'bg-white text-slate-500 group-hover:bg-[#d5e3ff]'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>

                <span className={`font-medium ${isSelected ? 'text-[#191c1e]' : 'text-[#424750]'}`}>{opt}</span>

                {isSelected ? <CheckCircle2 size={18} className="absolute right-4 text-[#003466]" /> : null}
              </button>
            );
          })}
        </div>
      );

    case 'true_false':
      return (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[true, false].map((val) => {
            const isSelected = answer === val;

            return (
              <button
                key={String(val)}
                onClick={() => handleSelect(val)}
                className={`rounded-xl border px-4 py-5 text-sm font-bold transition-all ${
                  isSelected
                    ? val
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-[#eceef0] text-slate-600 hover:bg-[#e0e3e5]'
                }`}
              >
                {val ? 'ĐÚNG' : 'SAI'}
              </button>
            );
          })}
        </div>
      );

    case 'fill_blank': {
      const textValue = typeof answer === 'string' ? answer : '';

      return (
        <div className="mt-8">
          <input
            type="text"
            value={textValue}
            onChange={(event) => handleSelect(event.target.value)}
            placeholder="Nhập câu trả lời của bạn tại đây..."
            className="w-full rounded-xl border border-slate-200 bg-[#f2f4f6] px-4 py-3 text-base font-medium text-[#191c1e] outline-none transition focus:border-[#003466] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,52,102,0.12)]"
          />
        </div>
      );
    }

    default:
      return null;
  }
};

export default QuestionRenderer;
