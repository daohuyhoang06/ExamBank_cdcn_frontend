import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useExam } from '../hooks/useExam';
import QuestionRenderer from '../components/exam/QuestionRenderer';
import ExamSidebar from '../components/exam/ExamSidebar';
import ExamHeader from '../components/exam/ExamHeader';
import type { SubmitReason } from '@/features/user/types/user.type';

const Exampage = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { exam, isLoadingExam, examLoadError, currentIndex, setCurrentIndex, userAnswers, setUserAnswers, timeLeft, submitExam, isSubmitting, submitError } = useExam(examId);

  const handleSubmit = async (reason: SubmitReason = 'MANUAL') => {
    if (!exam || isSubmitting) {
      return;
    }

    const result = await submitExam(reason);
    if (!result) {
      return;
    }

    navigate(`/user/exambank/examreview?sessionId=${result.sessionId}`, {
      state: {
        examTitle: exam.title,
        questionCount: exam.questions.length,
        totalScore: result.totalScore ?? 0,
      },
    });
  };

  if (isLoadingExam) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 font-bold text-slate-400 animate-pulse">
      Đang tải đề thi...
    </div>
  );

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-base font-bold text-amber-800">Không thể mở đề thi</p>
          <p className="mt-2 text-sm text-amber-700">
            {examLoadError ?? 'Hiện chưa thể tải đề này. Vui lòng thử lại sau.'}
          </p>
        </div>
      </div>
    );
  }

  if (exam.questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="max-w-lg rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
          <p className="text-base font-bold text-blue-900">Đề thi chưa sẵn sàng</p>
          <p className="mt-2 text-sm text-blue-700">
            Đề này đã được đăng nhưng chưa có câu hỏi, nên bạn chưa thể làm ngay lúc này.
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header cố định phía trên */}
      <ExamHeader
        exam={exam}
        timeLeft={timeLeft}
        isSubmitting={isSubmitting}
        onSubmit={() => void handleSubmit('MANUAL')}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-6">
        {timeLeft === 0 && !isSubmitting && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            Đã hết thời gian làm bài. Hệ thống sẽ không tự nộp, bạn hãy bấm "Nộp bài" khi sẵn sàng.
          </div>
        )}

        {submitError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {submitError}
          </div>
        )}
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