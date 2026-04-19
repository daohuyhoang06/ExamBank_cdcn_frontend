import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Timer, BookOpen, PlayCircle, ChevronDown, Check, BookMarked, School, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Pagination } from "@/components/ui/Pagination/pagination";
import { examService, userService } from "../services/user.service";
import type { EducationLevel, ExamListItem, Subject } from "../types/user.type";

const ALL_SUBJECT = "Tất cả môn học";
const ALL_LEVEL = "Tất cả lớp học";
const EXAMS_PER_PAGE = 9;

const isAllSubjectOption = (value?: string): boolean => {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized.includes("tất cả") || normalized.includes("tat ca");
};

const isAllLevelOption = (value?: string): boolean => {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized.includes("tất cả") || normalized.includes("tat ca");
};

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

const CARD_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1400&q=80",
];

const normalizeSearchText = (value?: string): string =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const resolveExamCardImage = (exam: ExamListItem, index: number): string => {
  const normalizedSubject = normalizeSearchText(exam.subjectName);
  if (normalizedSubject.includes("toan") || normalizedSubject.includes("math")) {
    return "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1400&q=80";
  }
  if (normalizedSubject.includes("ly") || normalizedSubject.includes("physics")) {
    return "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=1400&q=80";
  }
  if (normalizedSubject.includes("hoa") || normalizedSubject.includes("chem")) {
    return "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1400&q=80";
  }
  if (normalizedSubject.includes("anh") || normalizedSubject.includes("english")) {
    return "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1400&q=80";
  }

  return CARD_FALLBACK_IMAGES[index % CARD_FALLBACK_IMAGES.length];
};

export default function OnlineExamPage() {
  const navigate = useNavigate();
  const [allExams, setAllExams] = useState<ExamListItem[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>(ALL_LEVEL);
  const [selectedSubject, setSelectedSubject] = useState<Subject>(ALL_SUBJECT);
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>(ALL_LEVEL);
  const [filterSubject, setFilterSubject] = useState<Subject>(ALL_SUBJECT);
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [exams, subjectOptions, levelOptions] = await Promise.all([
          examService.getAllExams(),
          userService.getSubjects(),
          userService.getEducationLevels(),
        ]);

        const sortedExams = [...exams].sort((left, right) => {
          const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
          return rightTime - leftTime;
        });

        setAllExams(sortedExams);
        setSubjects(subjectOptions ?? []);
        setEducationLevels(levelOptions ?? []);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const levelFilterOptions = useMemo(() => {
    const levelNames = educationLevels
      .map((level) => level.name)
      .filter((name) => name && !isAllLevelOption(name));
    const classNamesFromExam = allExams
      .map((exam) => exam.className ?? exam.educationLevelName)
      .filter((value): value is string => Boolean(value && value.trim().length > 0));

    return [ALL_LEVEL, ...Array.from(new Set([...levelNames, ...classNamesFromExam]))];
  }, [educationLevels, allExams]);

  const subjectFilterOptions = useMemo(() => {
    const normalizedSubjects = Array.from(
      new Set(subjects.filter((subject) => subject && !isAllSubjectOption(subject)))
    );
    return [ALL_SUBJECT, ...normalizedSubjects];
  }, [subjects]);

  const applyFilters = () => {
    setKeyword(filterKeyword);
    setSelectedLevel(filterLevel);
    setSelectedSubject(filterSubject);
    setCurrentPage(1);
    setIsLevelOpen(false);
    setIsSubjectOpen(false);
  };

  const filteredExams = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const normalizedLevel = selectedLevel.trim().toLowerCase();
    const normalizedSubject = selectedSubject.trim().toLowerCase();
    const hasLevelFilter = !isAllLevelOption(selectedLevel);
    const hasSubjectFilter = !isAllSubjectOption(selectedSubject);

    return allExams.filter((exam) => {
      const title = exam.title.toLowerCase();
      const subject = (exam.subjectName ?? "").toLowerCase();
      const className = (exam.className ?? exam.educationLevelName ?? "").toLowerCase();

      const matchesKeyword = !normalizedKeyword || title.includes(normalizedKeyword) || subject.includes(normalizedKeyword);
      const matchesLevel = !hasLevelFilter || className.includes(normalizedLevel) || title.includes(normalizedLevel);
      const matchesSubject = !hasSubjectFilter || subject.includes(normalizedSubject);

      return matchesKeyword && matchesLevel && matchesSubject;
    });
  }, [allExams, keyword, selectedLevel, selectedSubject]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / EXAMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedExams = useMemo(() => {
    const start = (safeCurrentPage - 1) * EXAMS_PER_PAGE;
    return filteredExams.slice(start, start + EXAMS_PER_PAGE);
  }, [filteredExams, safeCurrentPage]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#003466] p-8 text-white">
        <h1 className="mb-2 text-3xl font-black">Thi online</h1>
        <p className="text-sm font-medium text-blue-200/70">
          Danh sách đề thi do quản trị viên đăng tải. Chọn đề để vào phòng thi trực tuyến.
        </p>
      </section>

      <section className="relative z-50 flex flex-col items-center gap-4 rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm md:flex-row">
        <div className="group relative w-full flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filterKeyword}
            onChange={(event) => setFilterKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applyFilters();
              }
            }}
            placeholder="Tên đề thi..."
            className="w-full rounded-2xl bg-slate-50 py-3 pl-12 pr-4 font-bold focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="relative w-full md:w-64">
          <button
            onClick={() => {
              setIsLevelOpen((prev) => !prev);
              setIsSubjectOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-2xl border px-5 py-3"
          >
            <div className="flex items-center gap-3">
              <School className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-bold">{filterLevel || "Chọn lớp"}</span>
            </div>
            <ChevronDown className={`h-4 w-4 ${isLevelOpen ? "rotate-180" : ""}`} />
          </button>

          {isLevelOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl bg-white shadow-lg">
              {levelFilterOptions.map((level) => (
                <div
                  key={level}
                  onClick={() => {
                    setFilterLevel(level);
                    setIsLevelOpen(false);
                  }}
                  className="flex cursor-pointer justify-between px-4 py-3 hover:bg-blue-50"
                >
                  <span>{level}</span>
                  {filterLevel === level && <Check className="h-4 w-4" />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative w-full md:w-64">
          <button
            onClick={() => {
              setIsSubjectOpen((prev) => !prev);
              setIsLevelOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-2xl border px-5 py-3"
          >
            <div className="flex items-center gap-3">
              <BookMarked className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-bold">{filterSubject || "Chọn môn"}</span>
            </div>
            <ChevronDown className={`h-4 w-4 ${isSubjectOpen ? "rotate-180" : ""}`} />
          </button>

          {isSubjectOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl bg-white shadow-lg">
              {subjectFilterOptions.map((subject) => (
                <div
                  key={subject}
                  onClick={() => {
                    setFilterSubject(subject);
                    setIsSubjectOpen(false);
                  }}
                  className="flex cursor-pointer justify-between px-4 py-3 hover:bg-indigo-50"
                >
                  <span>{subject}</span>
                  {filterSubject === subject && <Check className="h-4 w-4" />}
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={applyFilters} className="rounded-2xl bg-blue-600 px-6 py-3 text-white">
          Lọc
        </button>
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
        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {paginatedExams.map((exam, index) => {
              const cardImage = resolveExamCardImage(exam, (safeCurrentPage - 1) * EXAMS_PER_PAGE + index);
              const duration = exam.durationMinutes ?? 30;

              return (
                <article
                  key={exam.id}
                  className="group overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl"
                >
                  <div
                    className="relative h-44 overflow-hidden bg-[#002140] p-6 transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: `linear-gradient(160deg, rgba(0, 33, 64, 0.92), rgba(10, 64, 122, 0.78)), url(${cardImage})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-blue-400/50 blur-[85px]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(191,219,254,0.35),transparent_35%)]" />
                    <div className="relative z-10 flex h-full items-center justify-center">
                      <BookOpen className="h-16 w-16 text-blue-100/90 drop-shadow-lg" />
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Trực tuyến</span>
                    </div>

                    <h2 className="mb-2 line-clamp-2 text-lg font-black leading-tight text-slate-800 transition-colors group-hover:text-blue-600">
                      {exam.title}
                    </h2>

                    <p className="mb-5 text-xs font-semibold text-slate-500">
                      <span>#Mã đề: {exam.id}</span> | <span>{duration} phút</span>
                    </p>

                    <div className="mb-6 flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>{exam.subjectName ?? "Chưa phân loại"}</span>
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5 text-slate-400" />
                        {toDisplayDate(exam.createdAt)}
                      </span>
                    </div>

                    <button
                      onClick={() => navigate(`/user/exam/${exam.id}`)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#002140] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/15 transition-all hover:bg-blue-600"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Vào làm bài
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 sm:flex-row">
              <p className="text-sm text-slate-600">
                Trang {safeCurrentPage} / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={safeCurrentPage <= 1}
                  leftIcon={<ChevronLeft size={16} />}
                  className="rounded-lg px-3 py-2 text-slate-500"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  Trước
                </Button>
                <Pagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  rightIcon={<ChevronRight size={16} />}
                  disabled={safeCurrentPage >= totalPages}
                  className="rounded-lg px-3 py-2 text-slate-700 transition hover:bg-white"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  Tiếp
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
