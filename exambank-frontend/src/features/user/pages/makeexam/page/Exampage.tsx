import { useParams } from 'react-router-dom';
import { useExam } from '../hooks/useExam';
import QuestionRenderer from '../components/exam/QuestionRenderer';
import ExamSidebar from '../components/exam/ExamSidebar';
import ExamHeader from '../components/exam/ExamHeader';

const Exampage = () => {
  const { examId } = useParams();
  const { exam, currentIndex, setCurrentIndex, userAnswers, setUserAnswers, timeLeft } = useExam(examId);

  if (!exam) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 font-bold text-slate-400 animate-pulse">
      Đang tải đề thi...
    </div>
  );

  if (exam.questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 font-bold text-slate-500">
        Đề thi hiện chưa có câu hỏi.
      </div>
    );
  }

  const currentQuestion = exam.questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header cố định phía trên */}
      <ExamHeader exam={exam} timeLeft={timeLeft} />

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Vùng nội dung câu hỏi */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 md:p-12 min-h-[500px] flex flex-col">
              <div className="flex items-center gap-3 mb-8">
                <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-black tracking-tight">
                  CÂU HỎI {currentIndex + 1}
                </span>
                <div className="h-[1px] flex-1 bg-slate-100"></div>
              </div>

              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight mb-8">
                  {currentQuestion.question}
                </h2>

                <QuestionRenderer
                  question={currentQuestion}
                  index={currentIndex}
                  userAnswers={userAnswers}
                  setUserAnswers={setUserAnswers}
                />
              </div>

              {/* Navigation điều hướng nhanh trong câu hỏi */}
              <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-50">
                <button 
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
                >
                  Quay lại
                </button>
                <button 
                  disabled={currentIndex === exam.questions.length - 1}
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200"
                >
                  Câu tiếp theo
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar tiến độ bên phải */}
          <div className="lg:col-span-4">
            <ExamSidebar
              exam={exam}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
              userAnswers={userAnswers}
            />
          </div>

        </div>
      </main>
    </div>
  );
};

export default Exampage;