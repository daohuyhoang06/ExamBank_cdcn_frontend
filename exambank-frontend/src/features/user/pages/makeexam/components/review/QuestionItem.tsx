import { CheckCircle2, XCircle, ChevronRight, Clock } from 'lucide-react';

type QuestionItemProps = {
  status: 'correct' | 'incorrect';
  title: string;
  desc: string;
  time: string;
};

const QuestionItem = ({ status, title, desc, time }: QuestionItemProps) => {
  const isCorrect = status === 'correct';

  return (
    <div className={`group p-5 rounded-3xl border-2 transition-all cursor-pointer ${
      isCorrect 
        ? 'border-emerald-100 bg-white hover:border-emerald-200' 
        : 'border-red-100 bg-red-50/30 hover:border-red-200'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`mt-1 p-2 rounded-full ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
          {isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
              <Clock size={14} /> {time}
            </div>
          </div>
          <p className="text-slate-500 text-sm line-clamp-2 mb-3">{desc}</p>
          <div className="flex items-center text-indigo-600 text-sm font-bold group-hover:gap-2 transition-all">
            Xem chi tiết giải thích <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionItem;