import { useExamreview } from '../hooks/useExamreview';
import QuestionItem from '../components/review/QuestionItem';
import { Trophy, BookOpen, Target } from 'lucide-react';

const Examreview = () => {
  const { topics, leaderboard } = useExamreview();
  const accuracy =
    topics.length > 0
      ? Math.round(topics.reduce((sum, item) => sum + item.percentage, 0) / topics.length)
      : 0;

  const reviewItems = topics.slice(0, 3).map((topic, index) => ({
    status: (topic.percentage >= 70 ? 'correct' : 'incorrect') as 'correct' | 'incorrect',
    title: `Chủ đề: ${topic.name}`,
    desc: `Mức độ thành thạo hiện tại: ${topic.percentage}%. Ưu tiên ôn tập các phần còn yếu để cải thiện kết quả.`,
    time: `0:${String(30 + index * 10).padStart(2, '0')}`,
  }));

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Header Section */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2 italic tracking-tight">KẾT QUẢ PHÂN TÍCH</h1>
            <p className="text-slate-500 font-medium">Xem lại các lỗ hổng kiến thức và thứ hạng của bạn</p>
          </div>
          <div className="flex gap-3">
             <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Target className="text-indigo-600" />
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Độ chính xác</div>
                  <div className="text-xl font-black text-slate-900">{accuracy}%</div>
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Cột trái: Topics & Leaderboard */}
          <div className="lg:col-span-4 space-y-6">
            {/* Leaderboard */}
            <section className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="text-yellow-500" size={24} />
                <h3 className="font-black text-slate-800 uppercase tracking-wider">Bảng xếp hạng</h3>
              </div>
              <div className="space-y-3">
                {leaderboard.map((u, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${i === 0 ? 'bg-yellow-50 border border-yellow-100' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black ${i === 0 ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {i + 1}
                      </span>
                      <span className="font-bold text-slate-700">{u.name}</span>
                    </div>
                    <span className="font-mono font-bold text-indigo-600">{u.score} pts</span>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <p className="text-sm text-slate-400">Chưa có dữ liệu xếp hạng.</p>
                )}
              </div>
            </section>

            {/* Topics */}
            <section className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-100">
               <div className="flex items-center gap-3 mb-6">
                <BookOpen size={24} />
                <h3 className="font-black uppercase tracking-wider">Chủ đề cần nắm</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {topics.map((t, i) => (
                  <span key={i} className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-sm font-bold">
                    {t.name}
                  </span>
                ))}
                {topics.length === 0 && (
                  <p className="text-sm text-white/70">Chưa có dữ liệu chủ đề.</p>
                )}
              </div>
            </section>
          </div>

          {/* Cột phải: Danh sách câu hỏi (Review chi tiết) */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-lg font-black text-slate-800 mb-4 px-2 uppercase italic">Chi tiết bài làm</h3>

            {reviewItems.map((item) => (
              <QuestionItem
                key={item.title}
                status={item.status}
                title={item.title}
                desc={item.desc}
                time={item.time}
              />
            ))}
            {reviewItems.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                Chưa có dữ liệu chi tiết bài làm để hiển thị.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Examreview;