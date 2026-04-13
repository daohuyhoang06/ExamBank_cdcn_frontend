import { Check } from 'lucide-react';
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
    setUserAnswers({ ...userAnswers, [index]: val });
  };

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="space-y-3 mt-6">
          {question.options.map((opt: string, idx: number) => {
            const isSelected = answer === idx;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`w-full flex items-center p-4 rounded-2xl border-2 transition-all group ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50'
                    : 'border-slate-100 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl mr-4 font-bold transition-colors ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className={`text-[17px] font-semibold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                  {opt}
                </span>
                {isSelected && <Check className="ml-auto text-indigo-600" size={20} />}
              </button>
            );
          })}
        </div>
      );

    case 'true_false':
      return (
        <div className="flex gap-4 mt-6">
          {[true, false].map((val) => {
            const isSelected = answer === val;
            return (
              <button
                key={String(val)}
                onClick={() => handleSelect(val)}
                className={`flex-1 py-8 rounded-3xl border-2 font-black transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-inner'
                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                }`}
              >
                <span className="text-xl uppercase tracking-widest">{val ? 'Đúng' : 'Sai'}</span>
              </button>
            );
          })}
        </div>
      );

    case 'fill_blank':
      {
      const textValue = typeof answer === 'string' ? answer : '';
      return (
        <div className="mt-6">
          <input
            type="text"
            value={textValue}
            onChange={(e) => handleSelect(e.target.value)}
            placeholder="Nhập câu trả lời của bạn tại đây..."
            className="w-full p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none text-lg font-semibold transition-all"
          />
        </div>
      );
      }

    default:
      return null;
  }
};

export default QuestionRenderer;