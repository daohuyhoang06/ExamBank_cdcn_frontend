import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { examService } from '@/features/user/services/user.service';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  HelpCircle, 
  LayoutGrid, 
  BookmarkCheck,
  AlertTriangle 
} from 'lucide-react';

// ================= RENDER CÂU HỎI =================
const QuestionRenderer = ({ question, index, userAnswers, setUserAnswers }: any) => {
  const answer = userAnswers[index];

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {question.options.map((opt: string, idx: number) => {
            const label = String.fromCharCode(65 + idx);
            const isSelected = answer === idx;
            return (
              <button
                key={idx}
                onClick={() => setUserAnswers({ ...userAnswers, [index]: idx })}
                className={`flex items-center p-5 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-[#1e40af] bg-blue-50/50 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl mr-4 font-black ${
                  isSelected ? 'bg-[#1e40af] text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {label}
                </span>
                <span className={`font-bold text-lg ${isSelected ? 'text-[#1e40af]' : 'text-slate-800'}`}>{opt}</span>
              </button>
            );
          })}
        </div>
      );

    case 'true_false':
      return (
        <div className="grid grid-cols-2 gap-6 mt-8">
          {[true, false].map((val) => {
            const isSelected = answer === val;
            return (
              <button
                key={String(val)}
                onClick={() => setUserAnswers({ ...userAnswers, [index]: val })}
                className={`flex flex-col items-center justify-center p-10 rounded-[2rem] border-2 transition-all ${
                  isSelected
                    ? 'border-[#1e40af] bg-blue-50/50 ring-4 ring-blue-50'
                    : 'border-slate-100 bg-white hover:bg-slate-50'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                  isSelected ? 'bg-[#1e40af] text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {val ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                </div>
                <span className={`text-2xl font-black ${isSelected ? 'text-[#1e40af]' : 'text-slate-800'}`}>
                  {val ? 'ĐÚNG' : 'SAI'}
                </span>
              </button>
            );
          })}
        </div>
      );

    case 'fill_blank':
      return (
        <div className="mt-8">
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => setUserAnswers({ ...userAnswers, [index]: e.target.value })}
            placeholder="Nhập đáp án của bạn..."
            className="w-full p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-[#1e40af] focus:ring-0 text-xl font-bold text-slate-800 transition-all shadow-inner"
          />
        </div>
      );

    default: return null;
  }
};

// ================= MAIN PAGE =================
const ExamPage = () => {
  const { examId } = useParams<{ examId: string }>();
  const [exam, setExam] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!examId) return;
    const fetchData = async () => {
      const data = await examService.getExamById(examId);
      if (data) {
        setExam(data);
        setTimeLeft(data.duration * 60);
      }
    };
    fetchData();
  }, [examId]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  if (!exam) return (
    <div className="p-20 text-center font-black text-slate-300 tracking-widest uppercase animate-pulse">
      Đang tải đề thi...
    </div>
  );

  const currentQuestion = exam.questions[currentIndex];
  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const completionPercent = (Object.keys(userAnswers).length / exam.questions.length) * 100;

  return (
    <div className="w-full space-y-6 pb-10 -mt-2">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1e40af] border border-blue-100">
            <BookmarkCheck size={36} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">{exam.title}</h1>
            <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-black text-[#1e40af] bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-wider">{exam.subject || "Khác"}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{exam.questions.length} CÂU HỎI</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-3 px-8 py-4 rounded-3xl font-mono text-3xl font-black border-2 shadow-inner transition-all ${
            timeLeft < 300 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-800'
          }`}>
            <Clock size={28} className={timeLeft < 300 ? 'text-red-500' : 'text-[#1e40af]'} />
            {formatTime(timeLeft)}
          </div>
          <button className="bg-[#1e40af] !text-white hover:bg-[#1e3a8a] px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-[2px] shadow-xl shadow-blue-200 transition-all active:scale-95 border-none">
            Nộp bài
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* 2. CỘT CÂU HỎI (CHIẾM 3/4) */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-sm border border-slate-100 min-h-[600px] flex flex-col relative overflow-hidden">
             {/* Progress Bar tinh tế trên đỉnh card */}
             <div className="absolute top-0 left-0 w-full h-2 bg-slate-50">
                <div 
                  className="h-full bg-[#1e40af] transition-all duration-700 ease-out" 
                  style={{ width: `${completionPercent}%` }}
                ></div>
             </div>

             <div className="mb-12">
               <span className="px-6 py-2 bg-slate-900 !text-white rounded-2xl text-sm font-black uppercase tracking-[3px]">
                 CÂU HỎI {currentIndex + 1}
               </span>
             </div>

             <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-auto">
               {currentQuestion.question}
             </h2>

             <QuestionRenderer
               question={currentQuestion}
               index={currentIndex}
               userAnswers={userAnswers}
               setUserAnswers={setUserAnswers}
             />
          </div>

          {/* Nút điều hướng chân trang */}
          <div className="flex justify-between items-center px-6">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(currentIndex - 1)}
              className="flex items-center gap-3 font-black text-slate-400 hover:text-[#1e40af] disabled:opacity-10 uppercase text-xs tracking-widest transition-all"
            >
              <ChevronLeft size={24} /> Câu trước
            </button>
            <button
              disabled={currentIndex === exam.questions.length - 1}
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="flex items-center gap-4 bg-slate-900 !text-white px-10 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-[2px] hover:bg-[#1e40af] transition-all shadow-2xl shadow-slate-200 border-none"
            >
              Câu kế tiếp <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* 3. SIDEBAR (CHIẾM 1/4) */}
        <aside className="xl:col-span-1">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 sticky top-6">
            <div className="flex items-center gap-3 mb-8">
              <LayoutGrid size={24} className="text-[#1e40af]" />
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Tiến độ làm bài</h3>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {exam.questions.map((_: any, idx: number) => {
                const isCurrent = currentIndex === idx;
                const isDone = userAnswers[idx] !== undefined;

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-12 rounded-2xl font-black text-lg transition-all border-2 ${
                      isCurrent 
                        ? 'border-[#1e40af] bg-white text-[#1e40af] shadow-lg scale-110' 
                        : isDone 
                        ? 'border-[#2563eb] bg-[#2563eb] !text-white shadow-md shadow-blue-100' 
                        : 'border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-10 p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100">
               <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 mb-3 tracking-tighter">
                  <span>Hoàn thành</span>
                  <span className="text-slate-900 font-black">{Object.keys(userAnswers).length}/{exam.questions.length}</span>
               </div>
               <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-[#1e40af] transition-all duration-500" 
                    style={{ width: `${completionPercent}%` }}
                  ></div>
               </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-slate-300 font-bold text-[10px] uppercase tracking-[2px]">
               <HelpCircle size={14} /> Exambank Scholar
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ExamPage;