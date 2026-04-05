import React, { useEffect, useState } from 'react';
import { 
  RefreshCcw, 
  Share2, 
  CheckCircle2, 
  XCircle, 
  Star, 
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Send
} from 'lucide-react';
import type{ TopicData, LeaderboardUser } from '../../types/user.type';
import { userService } from '../../services/user.service';

interface QuestionItemProps {
  status: 'correct' | 'incorrect';
  title: string;
  desc: string;
  time: string;
}

// --- Sub-components ---
const QuestionItem: React.FC<QuestionItemProps> = ({ status, title, desc, time }) => {
  const isCorrect = status === 'correct';
  return (
    <div className={`p-5 rounded-2xl flex items-start gap-4 transition-all border ${
      isCorrect ? 'bg-white border-slate-100 hover:border-emerald-200' : 'bg-red-50/30 border-red-100'
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-red-100 text-red-600'
      }`}>
        {isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
      </div>
      <div className="flex-grow">
        <div className="flex justify-between items-start">
          <h3 className={`font-bold text-sm md:text-base ${isCorrect ? 'text-[#003466]' : 'text-red-700'}`}>{title}</h3>
          <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{time}</span>
        </div>
        <p className={`text-sm mt-1 mb-3 ${isCorrect ? 'text-slate-500' : 'text-red-600/80 italic'}`}>{desc}</p>
        <button className={`text-xs font-bold flex items-center gap-1 group ${isCorrect ? 'text-[#003466]' : 'text-red-600'}`}>
          {isCorrect ? 'Xem lời giải' : 'Phân tích lỗi'} 
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function ExamResultPage() {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const t = await userService.getTopics();
      const l = await userService.getLeaderboard();
      setTopics(t);
      setLeaderboard(l);
    };
    fetchData();
  }, []);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* 1. TOP SUMMARY BAR */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-4xl font-black text-[#003466] tracking-tight">
            Kết quả: Đại Số Tuyến Tính
          </h1>
          <p className="text-slate-500">Hệ thống ghi nhận bạn đã hoàn thành bài thi mức độ Khó.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button className="bg-[#003466] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all shadow-md">
              <RefreshCcw size={16} /> Làm lại bài thi
            </button>
            <button className="bg-slate-50 text-[#003466] px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 border border-slate-200 hover:bg-slate-100 transition-all">
              <Share2 size={16} /> Chia sẻ
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 md:gap-10 bg-[#f8fafc] p-6 rounded-2xl border border-slate-100">
          <div className="text-center">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Điểm số</p>
            <p className="text-3xl font-black text-[#003466]">9.5</p>
          </div>
          <div className="text-center border-x border-slate-200 px-4 md:px-10">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Thời gian</p>
            <p className="text-3xl font-black text-[#003466]">42:15</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Đúng</p>
            <p className="text-3xl font-black text-emerald-600">19/20</p>
          </div>
        </div>
      </div>

      {/* 2. MAIN BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8/12) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Năng lực chủ đề */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-[#003466]">
              <TrendingUp size={22} />
              <h2 className="text-xl font-bold">Năng lực theo chủ đề</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topics.map((topic, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500 uppercase truncate mr-2">{topic.name}</span>
                    <span className="text-sm font-black text-[#003466]">{topic.percentage}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${topic.color} transition-all duration-700`} style={{ width: `${topic.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danh sách câu hỏi */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-xl font-bold text-[#003466] mb-6">Chi tiết từng câu hỏi</h2>
            <div className="space-y-4">
              <QuestionItem status="correct" title="Câu 01: Ma trận nghịch đảo" desc="Tính toán chính xác theo phương pháp Gauss-Jordan." time="0:45" />
              <QuestionItem status="incorrect" title="Câu 14: Không gian Vector" desc="Nhầm lẫn điều kiện của không gian con không rỗng." time="2:15" />
              <QuestionItem status="correct" title="Câu 15: Định thức ma trận" desc="Áp dụng đúng tính chất của ma trận tam giác." time="1:10" />
            </div>
          </div>
        </div>

        {/* Right Column (4/12) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Rank Badge */}
          <div className="bg-gradient-to-br from-[#003466] to-[#1e4e85] text-white p-8 rounded-3xl shadow-xl text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-24 h-24 rounded-full border-4 border-emerald-400 flex items-center justify-center mb-4 mx-auto bg-white/5 backdrop-blur-sm">
                <span className="text-4xl font-black text-emerald-400">A+</span>
              </div>
              <h3 className="font-bold text-xl">Hạng: Xuất sắc</h3>
              <p className="text-blue-100/70 text-sm mt-2">Bạn nằm trong Top 5% học viên có kết quả cao nhất.</p>
              <div className="mt-6 inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                <Star size={16} className="text-amber-400" fill="currentColor" />
                <span className="text-[10px] font-bold uppercase tracking-widest">+250 Scholar XP</span>
              </div>
            </div>
          </div>

          {/* Bảng xếp hạng */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-[#003466] mb-5">Xếp hạng lớp học</h2>
            <div className="space-y-3">
              {leaderboard.map((user, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${user.isUser ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50'}`}>
                  <span className={`text-xs font-black ${user.isUser ? 'text-[#003466]' : 'text-slate-400'}`}>{user.rank}</span>
                  <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden shrink-0">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt="avt" />
                  </div>
                  <span className={`flex-grow text-sm ${user.isUser ? 'font-bold text-[#003466]' : 'text-slate-600'}`}>{user.name}</span>
                  <span className="text-sm font-black">{user.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: RATING & COMMENTS (Lấp đầy chiều rộng) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Đánh giá đề thi (1/3) */}
        <div className="bg-[#1a2b3c] text-white p-8 rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Đánh giá đề thi</h2>
            <p className="text-slate-400 text-sm mb-6">Ý kiến của bạn giúp chúng tôi cải thiện chất lượng đề thi.</p>
            
            <div className="flex items-center gap-2 mb-2">
              <div className="flex text-amber-400">
                {[...Array(4)].map((_, i) => <Star key={i} size={24} fill="currentColor" />)}
                <Star size={24} />
              </div>
              <span className="text-xl font-bold ml-2">4.0</span>
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Độ khó: Trung bình - Khó</p>
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-sm font-bold text-slate-300">Bạn thấy đề thi này thế nào?</p>
            <div className="flex gap-2">
              {['Dễ', 'Vừa sức', 'Khó'].map((level) => (
                <button key={level} className="flex-grow py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all">
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bình luận & Thảo luận (2/3) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-[#003466] flex items-center gap-2">
              Thảo luận cộng đồng
              <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full font-normal">128 bình luận</span>
            </h2>
            <MessageSquare size={20} className="text-slate-300" />
          </div>

          {/* List bình luận mẫu */}
          <div className="space-y-6 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 shrink-0 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Linh" alt="user" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#003466]">Nguyễn Diệu Linh</span>
                  <span className="text-[10px] text-slate-400">2 giờ trước</span>
                </div>
                <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl rounded-tl-none">
                  Câu 14 thực sự rất dễ nhầm lẫn nếu không để ý kỹ điều kiện của Vector không. Cảm ơn phần giải thích chi tiết!
                </p>
              </div>
            </div>
          </div>

          {/* Ô nhập bình luận */}
          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Thang" alt="me" />
            </div>
            <div className="relative flex-grow">
              <input 
                type="text" 
                placeholder="Viết phản hồi hoặc đặt câu hỏi..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#003466] transition-all"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#003466] text-white rounded-xl hover:opacity-90 transition-all">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}