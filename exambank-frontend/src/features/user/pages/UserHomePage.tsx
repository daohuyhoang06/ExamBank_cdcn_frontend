
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Info, 
  Award
} from "lucide-react";
import type { Ranking } from '../types/user.type';
import { userService } from '../services/user.service';

export default function UserHomePage() {
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<Ranking[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ranks = await userService.getRankings();
        setRankings(ranks);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      
      {/* SECTION 1: Hero & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Banner Progress */}
        <section className="lg:col-span-2 bg-white p-8 rounded-2xl relative overflow-hidden shadow-sm border border-slate-100 group transition-all hover:shadow-md">
          {/* Hình tròn trang trí phía sau */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-500" />
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
                Tiếp tục lộ trình
              </span>
              <h2 className="text-3xl font-extrabold text-[#003466] mt-4 leading-tight max-w-md">
                Luyện thi Đánh giá năng lực ĐHQG-HCM
              </h2>
              <p className="text-slate-500 mt-2 max-w-sm">
                Bạn đã hoàn thành 65% chặng đường. Chỉ còn 12 bài học để đạt mục tiêu 850+.
              </p>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-tighter">Tiến độ tổng quan</span>
                <span className="text-xs font-bold text-blue-800">65%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  style={{ width: "65%" }}
                />
              </div>
              <button
                onClick={() => navigate('/user/exambank')}
                className="mt-6 bg-gradient-to-r from-[#003466] to-[#1a4b84] hover:opacity-90 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transition-all active:scale-95"
              >
                Làm bài ngay
              </button>
            </div>
          </div>
        </section>

        {/* Radar Chart (Năng lực) */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Phân tích năng lực</h3>
            <Info className="w-4 h-4 text-slate-300 cursor-help" />
          </div>
          <div className="flex items-center justify-center py-4">
             {/* Simple SVG Radar Mockup */}
             <div className="relative w-44 h-44">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-30">
                   {/* Background Polygons */}
                   <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                   <polygon points="50,25 75,35 75,65 50,75 25,65 25,35" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                   {/* Data Shape */}
                   <polygon 
                      points="50,15 85,35 80,70 50,85 20,65 15,40" 
                      fill="rgba(0, 52, 102, 0.15)" 
                      stroke="#003466" 
                      strokeWidth="2" 
                    />
                </svg>
                {/* Labels (Absolute Positioning) */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 uppercase">Toán</div>
                <div className="absolute top-1/4 -right-6 text-[9px] font-bold text-slate-400 uppercase">Logic</div>
                <div className="absolute bottom-1/4 -right-8 text-[9px] font-bold text-slate-400 uppercase">Tiếng Anh</div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 uppercase">Văn học</div>
             </div>
          </div>
        </section>
      </div>

      {/* SECTION 2: Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Ranking */}
        <section className="lg:col-span-12 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 px-2">Xếp hạng tuần</h3>
          
          <div className="space-y-2 flex-1">
            {rankings.map((item) => (
              <div key={item.rank} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs
                  ${item.rank === 1 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                  {item.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-100 shadow-sm">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`} alt="avatar" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-slate-700">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {item.score} điểm
                  </p>
                </div>
                {item.rank === 1 && <Award className="w-5 h-5 text-amber-500 fill-amber-500/20" />}
              </div>
            ))}
            {rankings.length === 0 && (
              <p className="px-2 text-sm text-slate-400">Chưa có dữ liệu bảng xếp hạng.</p>
            )}
          </div>

          {/* User Rank Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100">
             <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-inner shadow-blue-100/50">
                <div className="w-8 h-8 flex items-center justify-center font-black text-blue-700">12</div>
                <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-xs">
                   MH
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-blue-900 leading-none">Bạn (Minh Hoàng)</p>
                  <p className="text-[10px] text-blue-700/60 mt-1 font-bold italic">842/1200 điểm</p>
                </div>
                <span className="text-xs font-black text-emerald-600">+5</span>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
