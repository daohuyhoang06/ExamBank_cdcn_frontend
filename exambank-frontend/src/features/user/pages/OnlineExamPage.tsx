import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Timer, BookOpen, PlayCircle } from "lucide-react";
import { examService, userService } from "../services/user.service";
import type { ExamListItem, Subject } from "../types/user.type";

const toDisplayDate = (isoDate?: string): string => {
  if (!isoDate) {
    return "Chưa cập nhật";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Chưa cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export default function OnlineExamPage() {
  const navigate = useNavigate();
  const [allExams, setAllExams] = useState<ExamListItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(["Tất cả môn học"]);
  const [keyword, setKeyword] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<Subject>("Tất cả môn học");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [exams, subjectOptions] = await Promise.all([
          examService.getAllExams(),
          userService.getSubjects(),
        ]);

        const sortedExams = [...exams].sort((left, right) => {
          const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
          return rightTime - leftTime;
        });

        setAllExams(sortedExams);
        setSubjects(subjectOptions.length > 0 ? subjectOptions : ["Tất cả môn học"]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const filteredExams = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const normalizedSubject = selectedSubject.trim().toLowerCase();
    const hasSubjectFilter = selectedSubject !== "Tất cả môn học";

    return allExams.filter((exam) => {
      const title = exam.title.toLowerCase();
      const subject = (exam.subjectName ?? "").toLowerCase();

      const matchesKeyword = !normalizedKeyword || title.includes(normalizedKeyword) || subject.includes(normalizedKeyword);
      const matchesSubject = !hasSubjectFilter || subject.includes(normalizedSubject);

      return matchesKeyword && matchesSubject;
    });
  }, [allExams, keyword, selectedSubject]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-[#003466]">Thi online</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Danh sách đề thi do quản trị viên đăng tải. Chọn đề để vào phòng thi trực tuyến.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-8">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên đề hoặc môn học..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={selectedSubject}
              onChange={(event) => setSelectedSubject(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring"
            >
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-500">
          Đang tải danh sách đề thi online...
        </section>
      ) : filteredExams.length === 0 ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-500">
          Chưa có đề thi phù hợp với bộ lọc hiện tại.
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredExams.map((exam) => (
            <article key={exam.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#003466]">{exam.title}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Mã đề #{exam.id} • Ngày đăng: {toDisplayDate(exam.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700">
                  Online
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Môn học</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <BookOpen className="h-4 w-4 text-[#003466]" />
                    {exam.subjectName ?? "Chưa phân loại"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Thời lượng</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Timer className="h-4 w-4 text-[#003466]" />
                    {exam.durationMinutes ?? 30} phút
                  </p>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => navigate(`/user/exam/${exam.id}`)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#003466] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  <PlayCircle className="h-4 w-4" />
                  Vào thi
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
