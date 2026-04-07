
import { useEffect, useState } from 'react';
import {
  Star,
  ChevronRight,
  Users,
  BarChart2,
  Image as ImageIcon,
  MoreHorizontal,
  ThumbsUp,
  Reply,
  Verified,
  Award
} from 'lucide-react';
import type { UserComment } from '../types/user.type';
import { userService } from '../services/user.service';
import { mockComments } from '../mocks/user.mock';

// --- Main Page Component ---
export default function DiscussionDetailPage() {
  const [comments, setComments] = useState<UserComment[]>(mockComments);

  useEffect(() => {
    const fetchComments = async () => {
      const data = await userService.getComments();
      setComments(data);
    };
    fetchComments();
  }, []);

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Breadcrumbs & Title Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <nav className="flex items-center text-sm text-slate-500 gap-2">
            <span>Thư viện</span>
            <ChevronRight size={14} />
            <span>Toán học</span>
            <ChevronRight size={14} />
            <span className="text-[#003466] font-bold">Chi tiết thảo luận</span>
          </nav>
          <h1 className="text-4xl font-black text-[#003466] tracking-tight">
            Đại số Tuyến tính Nâng cao
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
              <Star size={16} fill="#ffa825" className="text-[#ffa825] mr-1" />
              <span className="font-bold text-[#ffa825]">4.5</span>
              <span className="text-slate-400 ml-1 font-medium">/ 5</span>
            </div>
            <span className="text-slate-500 font-medium">(120 đánh giá)</span>
          </div>
        </div>
        <button className="bg-gradient-to-br from-[#003466] to-[#1a4b84] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/10 active:scale-95 transition-all">
          Làm lại đề thi
        </button>
      </div>

      {/* 2. Bento Grid: Stats & Ratings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Rating Overview */}
        <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-12 items-center">
          <div className="text-center space-y-2 min-w-[140px]">
            <span className="text-6xl font-black text-[#003466]">4.5</span>
            <div className="flex justify-center text-[#ffa825]">
              {[...Array(4)].map((_, i) => <Star key={i} size={20} fill="currentColor" />)}
              <Star size={20} className="opacity-40" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Trung bình</p>
          </div>
          
          <div className="flex-1 w-full space-y-3">
            {[
              { label: "5 sao", percent: 75 },
              { label: "4 sao", percent: 15 },
              { label: "3 sao", percent: 6 },
              { label: "2 sao", percent: 2 },
              { label: "1 sao", percent: 2 },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500 w-12">{row.label}</span>
                <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${row.percent}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-400 w-10 text-right">{row.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats Widget */}
        <div className="lg:col-span-4 bg-[#eef4ff] p-8 rounded-3xl border border-blue-100 flex flex-col justify-center space-y-6">
          <h3 className="font-bold text-[#003466] flex items-center gap-2">
            <BarChart2 size={20} /> Thống kê nhanh
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-600">
                <Users size={18} />
                <span className="text-sm font-medium">Số người đã làm</span>
              </div>
              <span className="font-black text-[#003466]">1,402</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-600">
                <Award size={18} />
                <span className="text-sm font-medium">Độ khó cộng đồng</span>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg uppercase">Trung bình</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Discussion Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Discussion Area */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Write Review Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-[#003466]">Viết đánh giá của bạn</h2>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200/50">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-bold text-slate-600">Chấm điểm:</span>
                <div className="flex gap-1 text-slate-300">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={24} className="hover:text-[#ffa825] cursor-pointer transition-colors" />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <textarea 
                  className="w-full bg-white rounded-2xl p-5 border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-[#003466] min-h-[140px] text-sm transition-all"
                  placeholder="Chia sẻ cảm nghĩ của bạn về độ khó, kiến thức và chất lượng đề thi..."
                />
                <div className="flex justify-between items-center">
                  <button className="flex items-center gap-2 text-[#003466] font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-all text-sm">
                    <ImageIcon size={20} /> Thêm hình ảnh
                  </button>
                  <button className="bg-[#003466] text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-md">
                    Gửi đánh giá
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Filter & Comment List */}
          <section className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-6">
              <h2 className="text-2xl font-bold text-[#003466]">Thảo luận cộng đồng</h2>
              <div className="flex items-center gap-2">
                {['Mới nhất', 'Đánh giá cao', 'Có hình ảnh'].map((filter, i) => (
                  <button key={filter} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${i === 0 ? 'bg-[#003466] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-10">
              {comments.map((comment) => (
                <div key={comment.id} className="group">
                  <div className="flex items-start gap-5">
                    <img src={comment.avatar} alt="avt" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-[#003466]">{comment.author}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex text-[#ffa825]">
                              {[...Array(comment.rating)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                            </div>
                            <span className="text-[11px] text-slate-400 font-bold uppercase">{comment.time}</span>
                          </div>
                        </div>
                        <button className="text-slate-300 hover:text-slate-600 transition-colors">
                          <MoreHorizontal size={20} />
                        </button>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[15px]">
                        {comment.content}
                      </p>
                      {comment.image && (
                        <div className="pt-2">
                          <img src={comment.image} alt="attached" className="w-40 h-28 object-cover rounded-2xl border border-slate-100 shadow-sm hover:scale-105 transition-transform cursor-zoom-in" />
                        </div>
                      )}
                      <div className="flex items-center gap-8 pt-2">
                        <button className="flex items-center gap-1.5 text-xs font-black text-[#003466] hover:opacity-70">
                          <ThumbsUp size={16} /> Thích ({comment.likes})
                        </button>
                        <button className="flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-[#003466]">
                          <Reply size={16} /> Phản hồi
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all">
              Xem thêm 118 bình luận khác
            </button>
          </section>
        </div>

        {/* Sidebar Info */}
        <aside className="lg:col-span-4 space-y-8">
          {/* Instructor Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-500 uppercase text-[11px] tracking-widest">Người tạo đề</h3>
            <div className="flex items-center gap-4">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Son" alt="TS" className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-100" />
              <div>
                <p className="font-black text-[#003466]">TS. Đặng Văn Sơn</p>
                <p className="text-xs text-slate-500 font-medium">Chuyên gia Toán Cao cấp</p>
                <div className="flex items-center gap-1 mt-1 text-emerald-600">
                  <Verified size={14} fill="currentColor" className="text-white" />
                  <span className="text-[10px] font-black uppercase">Đã xác thực</span>
                </div>
              </div>
            </div>
            <button className="w-full bg-slate-50 text-[#003466] py-3 rounded-xl text-xs font-black border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all">
              Theo dõi giảng viên
            </button>
          </div>

          {/* Related Exams */}
          <div className="space-y-6">
            <h3 className="font-bold text-[#003466] text-lg">Đề thi liên quan</h3>
            <div className="space-y-4">
              {[
                { tag: "Đại số 1", title: "Không gian Vector & Ma trận căn bản", info: "45 câu • 60 phút", rate: "4.8", color: "bg-emerald-50 text-emerald-700" },
                { tag: "Giải tích 2", title: "Chuỗi Fourier và Ứng dụng", info: "30 câu • 45 phút", rate: "4.2", color: "bg-amber-50 text-amber-700" },
                { tag: "Toán Rời rạc", title: "Lý thuyết Đồ thị nâng cao", info: "50 câu • 90 phút", rate: "4.9", color: "bg-blue-50 text-blue-700" },
              ].map((exam, i) => (
                <div key={i} className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
                  <span className={`text-[10px] font-black px-2 py-1 rounded ${exam.color}`}>{exam.tag}</span>
                  <h4 className="font-bold text-[#003466] mt-3 group-hover:text-blue-600 transition-colors">{exam.title}</h4>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-[11px] text-slate-400 font-medium">{exam.info}</span>
                    <div className="flex items-center gap-1 text-[#ffa825]">
                      <Star size={12} fill="currentColor" />
                      <span className="text-xs font-black">{exam.rate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="bg-[#003466] rounded-3xl p-8 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <h4 className="font-black text-2xl text-white leading-tight">Học không giới hạn</h4>
              <p className="text-blue-100/70 text-sm">Nâng cấp tài khoản Scholar Core để xem lời giải chi tiết và video bài giảng.</p>
              <button className="w-full bg-[#6bff8f] text-[#005321] py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform">
                Nâng cấp ngay
              </button>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Award size={160} className="text-white" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}