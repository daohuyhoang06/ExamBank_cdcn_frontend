import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const examCards = [
  {
    title: 'Vật lý đại cương',
    subject: 'KHOA HỌC',
    lessons: '1.2k lượt làm bài',
    img: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Giải tích II',
    subject: 'TOÁN HỌC',
    lessons: '2.5k lượt làm bài',
    img: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Văn học hiện đại',
    subject: 'NHÂN VĂN',
    lessons: '940 lượt làm bài',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
  },
];

function AnimatedCounter({
  target,
  format,
  durationMs = 1800,
  repeatDelayMs = 1400,
}: {
  target: number;
  format: (value: number, target: number) => string;
  durationMs?: number;
  repeatDelayMs?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let rafId = 0;
    let startedAt = 0;
    let restartTimer: ReturnType<typeof setTimeout> | undefined;

    const tick = (now: number) => {
      if (!startedAt) {
        startedAt = now;
      }

      const progress = Math.min((now - startedAt) / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * easedProgress));

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      restartTimer = setTimeout(() => {
        startedAt = 0;
        setValue(0);
        rafId = requestAnimationFrame(tick);
      }, repeatDelayMs);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      if (restartTimer) {
        clearTimeout(restartTimer);
      }
    };
  }, [durationMs, repeatDelayMs, target]);

  return <>{format(value, target)}</>;
}

const formatThousands = (value: number, target: number) => {
  if (value >= target) {
    return `${Math.round(target / 1000)}K+`;
  }

  return `${(value / 1000).toFixed(1)}K+`;
};

const formatPercent = (value: number, target: number) => `${Math.min(value, target)}%`;

export default function LandingPage() {
  return (
    <main className="bg-[#F3F4F6] text-[#0f1f4a]">
      <header className="sticky top-0 z-20 border-b border-[#dbe2ef] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <p className="font-[var(--font-body)] text-lg font-extrabold text-[#0a2e68]">Scholar Core</p>
          <nav className="hidden items-center gap-7 text-sm text-[#4f5f84] md:flex">
            <a href="#features" className="hover:text-[#0a2e68]">Tính năng</a>
            <a href="#library" className="hover:text-[#0a2e68]">Thư viện</a>
            <a href="#community" className="hover:text-[#0a2e68]">Dành cho Cộng tác viên</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link to="/login" className="inline-flex h-9 items-center rounded-md border border-[#d6ddeb] px-3.5 text-sm font-semibold text-[#16336f]">Đăng nhập</Link>
            <Link to="/register" className="inline-flex h-9 items-center rounded-md bg-[#0b3a78] px-3.5 text-sm font-semibold text-white">Đăng ký</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#dbe2ef] bg-[linear-gradient(0deg,rgba(236,242,251,0.88),rgba(236,242,251,0.88)),url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:py-16">
          <div className="lg:col-span-6">
            <h1 className="font-[var(--font-body)] text-[clamp(2.2rem,5vw,4.1rem)] font-black leading-[1.02] tracking-[-0.035em]">
              <span className="text-[#05853e]">Scholarly </span>
              <br />
              <span className="text-[#0c2f75]">Sanctuary</span>
            </h1>
            <p className="mt-6 max-w-[540px] text-[1.02rem] leading-7 text-[#4f5d7f]">
              Gia nhập nền tảng học tập cộng đồng để chuẩn bị cho các kỳ thi, cá nhân hóa lộ trình học tập và nhận phản thưởng từ những đóng góp học thuật.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex h-11 items-center rounded-md bg-[#0c397a] px-5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(10,49,110,0.22)]">Bắt đầu miễn phí</Link>
              <a href="#library" className="inline-flex h-11 items-center rounded-md border border-[#d0d9ea] bg-white px-5 text-sm font-semibold text-[#17366f]">Khám phá Thư viện</a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-[0_18px_32px_rgba(12,45,97,0.16)] backdrop-blur">
              <img
                src="https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=1200&q=80"
                alt="Học viên đang học"
                className="h-[240px] w-full rounded-lg object-cover"
              />
              <div className="mt-3 rounded-lg bg-[#eef3fb] px-3 py-2.5 text-sm text-[#41527a]">
                <p className="font-semibold text-[#203c72]">Đào tạo chuyên sâu</p>
                <p>Tập trung vào kỹ năng</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-[#dbe2ef] bg-[#f8f9fc] py-14">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <p className="font-[var(--font-label)] text-xs font-bold tracking-[0.18em] text-[#6f7fa5]">DÀNH CHO NGƯỜI HỌC</p>
          <h2 className="mt-2 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold text-[#0d2b63]">Nâng tầm trải nghiệm học tập của bạn</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-[#e0e6f2] bg-white p-5 shadow-[0_10px_20px_rgba(14,37,84,0.05)]">
              <p className="text-2xl text-[#0d2d6b]"><i className="fa-regular fa-compass" /></p>
              <h3 className="mt-4 text-lg font-bold text-[#102d64]">Ngân hàng đề thi khổng lồ</h3>
              <p className="mt-2 text-sm leading-6 text-[#5d6b8d]">Tiếp cận hàng ngàn đề thi thật đã được xác thực với công nghệ chấm điểm thông minh.</p>
            </article>
            <article className="rounded-xl border border-[#e0e6f2] bg-white p-5 shadow-[0_10px_20px_rgba(14,37,84,0.05)]">
              <p className="text-2xl text-[#0d2d6b]"><i className="fa-solid fa-arrow-trend-up" /></p>
              <h3 className="mt-4 text-lg font-bold text-[#102d64]">Phân tích Cá nhân hóa</h3>
              <p className="mt-2 text-sm leading-6 text-[#5d6b8d]">Xác định chính xác lỗ hổng kiến thức với hướng dẫn luyện sâu theo dữ liệu học tập theo thời gian.</p>
            </article>
            <article className="rounded-xl border border-[#e0e6f2] bg-white p-5 shadow-[0_10px_20px_rgba(14,37,84,0.05)]">
              <p className="text-2xl text-[#0d2d6b]"><i className="fa-solid fa-chart-simple" /></p>
              <h3 className="mt-4 text-lg font-bold text-[#102d64]">Bảng xếp hạng trực tiếp</h3>
              <p className="mt-2 text-sm leading-6 text-[#5d6b8d]">So sánh năng lực của bạn với hàng ngàn học giả toàn cầu trên các bảng xếp hạng cạnh tranh thời gian thực.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="community" className="border-b border-[#dbe2ef] bg-[#f5f7fb] py-14">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <img
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1200&q=80"
              alt="Cộng tác viên học thuật"
              className="h-[280px] w-full rounded-xl border border-[#d7deea] object-cover shadow-[0_14px_24px_rgba(14,35,78,0.18)]"
            />
          </div>
          <div className="lg:col-span-7">
            <p className="font-[var(--font-label)] text-xs font-bold tracking-[0.18em] text-[#ff8f1f]">DÀNH CHO CỘNG TÁC VIÊN</p>
            <h2 className="mt-2 text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold text-[#0d2b63]">Kiến tạo tương lai Giáo dục</h2>
            <ul className="mt-4 space-y-4 text-[#465880]">
              <li className="flex gap-3"><i className="fa-regular fa-rectangle-list mt-1 text-[#0f3d82]" /><span><strong className="text-[#0d2b63]">Kiếm Credits</strong> nhận thưởng xứng đáng cho các đóng góp đề thi chất lượng cao và định giá đóng góp trong cộng đồng.</span></li>
              <li className="flex gap-3"><i className="fa-solid fa-trophy mt-1 text-[#0f3d82]" /><span><strong className="text-[#0d2b63]">Tổ chức Cuộc thi</strong> tạo và quản lý các cuộc thi học thuật của riêng bạn để tìm kiếm và bồi dưỡng các tài năng hàng đầu.</span></li>
              <li className="flex gap-3"><i className="fa-solid fa-users mt-1 text-[#0f3d82]" /><span><strong className="text-[#0d2b63]">Xây dựng Cộng đồng</strong> tham gia đội ngũ chuyên gia cùng lan tỏa tri thức và hỗ trợ các cấp bậc học viên.</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section id="library" className="border-b border-[#dbe2ef] bg-[#f8f9fc] py-14">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold text-[#0d2b63]">Khám phá các đề thi nổi bật</h2>
              <p className="mt-1 text-sm text-[#62739a]">Những thử thách được chinh phục nhiều nhất trong tuần qua.</p>
            </div>
            <a href="#" className="text-sm font-semibold text-[#0d3f89]">Xem thư viện <i className="fa-solid fa-arrow-right ml-1" /></a>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {examCards.map((card) => (
              <article key={card.title} className="rounded-xl border border-[#dee5f3] bg-white p-2.5 shadow-[0_10px_20px_rgba(14,37,84,0.05)]">
                <img src={card.img} alt={card.title} className="h-[132px] w-full rounded-lg object-cover" />
                <div className="px-2 pb-2 pt-3">
                  <p className="inline-flex rounded-full bg-[#edf3ff] px-2.5 py-1 text-[0.66rem] font-bold text-[#3f66aa]">{card.subject}</p>
                  <h3 className="mt-2 text-base font-bold text-[#112f67]">{card.title}</h3>
                  <p className="mt-3 text-xs font-semibold text-[#2f9d57]"><i className="fa-solid fa-circle-check mr-1" /> {card.lessons}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0b3a78] py-12 text-white">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-8 px-4 text-center sm:grid-cols-3 sm:px-6">
          <div>
            <p className="text-[clamp(4.8rem,13vw,8.8rem)] font-black leading-none tracking-[-0.05em] text-white tabular-nums motion-safe:animate-[pulse_2.2s_ease-in-out_infinite]">
              <AnimatedCounter target={10000} format={formatThousands} />
            </p>
            <p className="mt-2 text-sm text-[#d6e5ff]">HỌC GIẢ HOẠT ĐỘNG</p>
          </div>
          <div>
            <p className="text-[clamp(4.8rem,13vw,8.8rem)] font-black leading-none tracking-[-0.05em] text-white tabular-nums motion-safe:animate-[pulse_2.2s_ease-in-out_infinite]">
              <AnimatedCounter target={5000} format={formatThousands} />
            </p>
            <p className="mt-2 text-sm text-[#d6e5ff]">ĐỀ THI ĐÓNG GÓP</p>
          </div>
          <div>
            <p className="text-[clamp(4.8rem,13vw,8.8rem)] font-black leading-none tracking-[-0.05em] text-white tabular-nums motion-safe:animate-[pulse_2.2s_ease-in-out_infinite]">
              <AnimatedCounter target={98} format={formatPercent} />
            </p>
            <p className="mt-2 text-sm text-[#d6e5ff]">TỶ LỆ THÀNH CÔNG</p>
          </div>
        </div>
      </section>

      <section className="border-b border-[#dbe2ef] bg-[#f8f9fc] py-14">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <h2 className="text-center text-[clamp(1.6rem,3vw,2.1rem)] font-extrabold text-[#0d2b63]">Gói dịch vụ đơn giản, Tập trung vào học giả</h2>
          <p className="mt-2 text-center text-sm text-[#66779f]">Bắt đầu miễn phí hoặc nâng cấp để bứt phá mạnh mẽ hành trình dựng tri thức.</p>

          <div className="mx-auto mt-8 grid max-w-[860px] gap-5 md:grid-cols-2">
            <article className="flex flex-col rounded-xl border border-[#dde5f2] bg-white p-6">
              <h3 className="text-2xl font-bold text-[#0f2f68]">Scholar Miễn phí</h3>
              <p className="mt-1 text-3xl font-black text-[#112f67]">0$ <span className="text-base font-semibold text-[#5f7098]">/tháng</span></p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-[#495a82]">
                <li><i className="fa-solid fa-circle-check mr-2 text-[#2f9d57]" />15 lượt làm bài mỗi tháng</li>
                <li><i className="fa-solid fa-circle-check mr-2 text-[#2f9d57]" />Tóm tắt bài giải với AI cơ bản</li>
                <li><i className="fa-solid fa-circle-check mr-2 text-[#2f9d57]" />Truy cập thư viện cộng đồng</li>
              </ul>
              <button className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md border border-[#b9c8e4] text-sm font-bold text-[#173973]">Bắt đầu ngay</button>
            </article>

            <article className="relative flex flex-col rounded-xl border-2 border-[#0e4289] bg-white p-6 shadow-[0_18px_34px_rgba(13,59,126,0.16)]">
              <span className="absolute right-4 top-[-12px] rounded-full bg-[#2aab64] px-3 py-1 text-xs font-bold tracking-[0.05em] text-white">PHỔ BIẾN NHẤT</span>
              <h3 className="text-2xl font-bold text-[#0f2f68]">Scholar Cao cấp</h3>
              <p className="mt-1 text-3xl font-black text-[#112f67]">12$ <span className="text-base font-semibold text-[#5f7098]">/tháng</span></p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-[#495a82]">
                <li><i className="fa-solid fa-circle-check mr-2 text-[#2f9d57]" />Không giới hạn lượt làm bài</li>
                <li><i className="fa-solid fa-circle-check mr-2 text-[#2f9d57]" />Phân tích AI nâng cao</li>
                <li><i className="fa-solid fa-circle-check mr-2 text-[#2f9d57]" />Giao diện tập trung, không quảng cáo</li>
                <li><i className="fa-solid fa-circle-check mr-2 text-[#2f9d57]" />Ưu tiên tiếp cận đề thi mới</li>
              </ul>
              <button className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#0b3a78] text-sm font-bold text-white">Nâng cấp ngay</button>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#edf2f9] px-4 py-14 sm:px-6">
        <div className="mx-auto flex min-h-[250px] w-full max-w-[1040px] flex-col items-center justify-center rounded-2xl border border-[#225191] bg-[linear-gradient(160deg,#0b3a78_0%,#0a2f64_100%)] px-6 py-10 text-center text-white shadow-[0_18px_32px_rgba(9,44,97,0.3)] sm:px-10">
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-[-0.03em]">Sẵn sàng nâng tầm tri thức?</h2>
          <p className="mx-auto mt-3 max-w-[720px] text-center text-lg leading-relaxed text-[#d3e2ff]">
            Tham gia ngay hôm nay và làm chủ lĩnh vực học thuật của bạn một cách chính xác.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="inline-flex h-11 items-center rounded-md bg-white px-6 text-sm font-bold text-[#0b3a78]">Tham gia ngay</Link>
            <a href="#features" className="inline-flex h-11 items-center rounded-md border border-white/40 px-6 text-sm font-bold text-white">Tìm hiểu thêm</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#dbe2ef] bg-white py-7">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-4 px-4 text-sm text-[#62739a] sm:flex-row sm:px-6">
          <p className="font-semibold text-[#13366e]">Scholar Core</p>
          <div className="flex flex-wrap justify-center gap-5 text-xs sm:text-sm">
            <a href="#features">Tính năng</a>
            <a href="#library">Thư viện</a>
            <a href="#community">Dành cho Cộng tác viên</a>
            <a href="#">Chính sách Bảo mật</a>
          </div>
          <p className="text-xs">© 2026 Scholar Core. Thành dưỡng tri thức.</p>
        </div>
      </footer>
    </main>
  );
}
