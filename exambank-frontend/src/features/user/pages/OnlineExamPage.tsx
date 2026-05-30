import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Timer, PlayCircle, ChevronDown, Check, BookMarked, School, Calendar, Crown, Lock } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination/pagination";
import { examService, userService } from "../services/user.service";
import type { ExamListItem, Subject } from "../types/user.type";
import { getStoredAuthToken } from "@/lib/api-client";

const ALL_SUBJECT = "T\u1ea5t c\u1ea3 m\u00f4n h\u1ecdc";
const ALL_LEVEL = "T\u1ea5t c\u1ea3 l\u1edbp h\u1ecdc";
const EXAMS_PER_PAGE = 9;
const CLASS_LEVEL_OPTIONS = Array.from({ length: 12 }, (_, index) => `L\u1edbp ${index + 1}`);

const normalizeSearchText = (value?: string): string =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isAllSubjectOption = (value?: string): boolean => normalizeSearchText(value).includes("tat ca");
const isAllLevelOption = (value?: string): boolean => normalizeSearchText(value).includes("tat ca");

const looksLikeMojibake = (value: string): boolean => /(Ã.|Â.|Æ.|Ð.|áº|á»|Ä.)/.test(value);

const repairMojibakeText = (value?: string): string => {
  const raw = (value ?? "").trim();
  if (!raw || !looksLikeMojibake(raw)) return raw;

  let repaired = raw;
  for (let i = 0; i < 2; i += 1) {
    try {
      const bytes = Uint8Array.from(repaired, (char) => char.charCodeAt(0) & 0xff);
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!decoded || decoded === repaired) break;
      repaired = decoded;
      if (!looksLikeMojibake(repaired)) break;
    } catch {
      break;
    }
  }

  return repaired;
};

const SUBJECT_DISPLAY_MAP: Record<string, string> = {
  "toan hoc": "To\u00e1n h\u1ecdc",
  toan: "To\u00e1n h\u1ecdc",
  "vat ly": "V\u1eadt l\u00fd",
  ly: "V\u1eadt l\u00fd",
  "hoa hoc": "H\u00f3a h\u1ecdc",
  hoa: "H\u00f3a h\u1ecdc",
  "sinh hoc": "Sinh h\u1ecdc",
  sinh: "Sinh h\u1ecdc",
  "ngu van": "Ng\u1eef v\u0103n",
  van: "Ng\u1eef v\u0103n",
  "tieng anh": "Ti\u1ebfng Anh",
  anh: "Ti\u1ebfng Anh",
  "lich su": "L\u1ecbch s\u1eed",
  "dia ly": "\u0110\u1ecba l\u00fd",
  "tin hoc": "Tin h\u1ecdc",
  gdcd: "Gi\u00e1o d\u1ee5c c\u00f4ng d\u00e2n",
};

const toTitleCase = (text: string): string =>
  text
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatSubjectLabel = (subject?: string): string => {
  const raw = repairMojibakeText(subject).replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const key = normalizeSearchText(raw);
  return SUBJECT_DISPLAY_MAP[key] ?? toTitleCase(raw);
};

const toDisplayDate = (isoDate?: string): string => {
  if (!isoDate) return "Ch\u01b0a c\u1eadp nh\u1eadt";

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Ch\u01b0a c\u1eadp nh\u1eadt";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const normalizeExamStatus = (status?: string | null): string => (status ?? "").trim().toUpperCase();

const isExamClosed = (status?: string | null, endAt?: string | null): boolean => {
  if (normalizeExamStatus(status) === "CLOSED") return true;
  if (!endAt) return false;
  const parsed = new Date(endAt);
  if (Number.isNaN(parsed.getTime())) return false;
  return Date.now() > parsed.getTime();
};

type ExamStatusTag = {
  label: string;
  className: string;
};

const getExamStatusTag = (status?: string | null, endAt?: string | null): ExamStatusTag | null => {
  const normalized = normalizeExamStatus(status);
  if (normalized === "ONGOING") {
    return {
      label: "Ongoing",
      className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    };
  }
  if (normalized === "PUBLISHED") {
    return {
      label: "Published",
      className: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
    };
  }
  if (normalized === "CLOSED" || isExamClosed(status, endAt)) {
    return {
      label: "Closed",
      className: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
    };
  }
  return null;
};
const CARD_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1400&q=80",
];

const buildCardAccent = (subject?: string): string => {
  const normalized = normalizeSearchText(subject);
  if (normalized.includes("toan") || normalized.includes("math")) return "from-[#003466] via-[#1a4b84] to-[#2c6fbe]";
  if (normalized.includes("hoa") || normalized.includes("chem")) return "from-[#5b2a00] via-[#8a3f00] to-[#c35f00]";
  if (normalized.includes("ly") || normalized.includes("physics")) return "from-[#213a7a] via-[#2b4e9b] to-[#3f66c7]";
  if (normalized.includes("anh") || normalized.includes("english")) return "from-[#0f5f52] via-[#14816f] to-[#21ab93]";
  if (normalized.includes("sinh")) return "from-[#245500] via-[#2f7600] to-[#409d00]";
  return "from-[#2f3a46] via-[#3f4d5c] to-[#56677a]";
};

const resolveExamCardImage = (subjectName: string | undefined, index: number): string => {
  const normalizedSubject = normalizeSearchText(subjectName);
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
      if (!getStoredAuthToken()) {
        navigate("/login", { replace: true });
        return;
      }

      setIsLoading(true);
      try {
        const [exams, subjectOptions] = await Promise.all([examService.getAllExams(), userService.getSubjects()]);

        const sortedExams = [...exams].sort((left, right) => {
          const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
          return rightTime - leftTime;
        });

        const normalizedExams = sortedExams.map((exam) => ({
          ...exam,
          title: repairMojibakeText(exam.title),
          subjectName: formatSubjectLabel(exam.subjectName),
          className: repairMojibakeText(exam.className),
          educationLevelName: repairMojibakeText(exam.educationLevelName),
        }));

        const normalizedSubjects = Array.from(
          new Set((subjectOptions ?? []).map((subject) => formatSubjectLabel(subject)).filter(Boolean)),
        );

        setAllExams(normalizedExams);
        setSubjects(normalizedSubjects);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [navigate]);

  const levelFilterOptions = useMemo(() => [ALL_LEVEL, ...CLASS_LEVEL_OPTIONS], []);

  const subjectFilterOptions = useMemo(() => {
    const normalizedSubjects = Array.from(new Set(subjects.filter((subject) => subject && !isAllSubjectOption(subject))));
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
    const normalizedKeyword = normalizeSearchText(keyword);
    const normalizedLevel = normalizeSearchText(selectedLevel);
    const normalizedSubject = normalizeSearchText(selectedSubject);
    const hasLevelFilter = !isAllLevelOption(selectedLevel);
    const hasSubjectFilter = !isAllSubjectOption(selectedSubject);

    return allExams.filter((exam) => {
      const title = normalizeSearchText(exam.title);
      const subject = normalizeSearchText(exam.subjectName);
      const className = normalizeSearchText(exam.className ?? exam.educationLevelName);

      const matchesKeyword = !normalizedKeyword || title.includes(normalizedKeyword) || subject.includes(normalizedKeyword);
      const matchesLevel = !hasLevelFilter || className.includes(normalizedLevel) || title.includes(normalizedLevel);
      const matchesSubject = !hasSubjectFilter || subject.includes(normalizedSubject);

      return matchesKeyword && matchesLevel && matchesSubject;
    });
  }, [allExams, keyword, selectedLevel, selectedSubject]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / EXAMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedExams = useMemo(() => {
    const start = (safeCurrentPage - 1) * EXAMS_PER_PAGE;
    return filteredExams.slice(start, start + EXAMS_PER_PAGE);
  }, [filteredExams, safeCurrentPage]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#003466] p-8 text-white">
        <h1 className="mb-2 text-3xl font-black">{"Thi online"}</h1>
        <p className="text-sm font-medium text-blue-200/70">
          {"Danh s\u00e1ch c\u00e1c \u0111\u1ec1 thi online \u0111\u01b0\u1ee3c t\u1ed5ng h\u1ee3p t\u1eeb nhi\u1ec1u ngu\u1ed3n kh\u00e1c nhau. B\u1ea1n c\u00f3 th\u1ec3 t\u00ecm ki\u1ebfm v\u00e0 l\u1ecdc theo m\u00f4n h\u1ecdc, l\u1edbp h\u1ecdc ho\u1eb7c t\u1eeb kh\u00f3a."}
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
              if (event.key === "Enter") applyFilters();
            }}
            placeholder={"T\u00ean \u0111\u1ec1 thi..."}
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
              <span className="text-sm font-bold">{filterLevel || "Ch\u1ecdn l\u1edbp"}</span>
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
              <span className="text-sm font-bold">{filterSubject || "Ch\u1ecdn m\u00f4n"}</span>
            </div>
            <ChevronDown className={`h-4 w-4 ${isSubjectOpen ? "rotate-180" : ""}`} />
          </button>

          {isSubjectOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl bg-white shadow-lg">
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
          {"L\u1ecdc"}
        </button>
      </section>

      {isLoading ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-500">
          {"\u0110ang t\u1ea3i danh s\u00e1ch \u0111\u1ec1 thi online..."}
        </section>
      ) : filteredExams.length === 0 ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-500">
          {"Ch\u01b0a c\u00f3 \u0111\u1ec1 thi ph\u00f9 h\u1ee3p v\u1edbi b\u1ed9 l\u1ecdc hi\u1ec7n t\u1ea1i."}
        </section>
      ) : (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">{"Danh s\u00e1ch cu\u1ed9c thi"}</p>
            <p className="text-xs font-bold text-slate-400">{`${filteredExams.length} \u0111\u1ec1`}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedExams.map((exam, index) => {
              const subjectLabel = exam.subjectName?.trim() ? exam.subjectName : "Đa môn";
              const cardImage = resolveExamCardImage(subjectLabel, (safeCurrentPage - 1) * EXAMS_PER_PAGE + index);
              const duration = exam.durationMinutes ?? 30;
              const statusTag = getExamStatusTag(exam.status, exam.endAt);

              return (
                <article
                  key={exam.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`relative h-28 bg-gradient-to-br ${buildCardAccent(subjectLabel)} p-3 text-white`}>
                    <img
                      src={cardImage}
                      alt={exam.title}
                      className="absolute inset-0 h-full w-full object-cover opacity-70"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/25" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide backdrop-blur">
                          {subjectLabel}
                        </span>
                        {exam.vip ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-950 shadow-sm">
                            <Crown size={11} className="fill-current" />
                            VIP
                          </span>
                        ) : null}
                      </div>
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-bold backdrop-blur">
                        {exam.className ?? exam.educationLevelName ?? "T\u1ef1 do"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex items-start gap-3">
                      <h2 className="min-h-[2.5rem] flex-1 overflow-hidden text-sm font-black leading-tight text-slate-900">
                        {exam.title}
                      </h2>
                      {exam.requiresUnlock ? (
                        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
                          <Lock size={11} />
                          {exam.vip ? 10 : 5} coin
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Timer size={12} /> {duration} {"ph\u00fat"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={12} /> {toDisplayDate(exam.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      {statusTag ? (
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusTag.className}`}>
                          {statusTag.label}
                        </span>
                      ) : <span />}

                      <button
                        onClick={() => navigate(`/user/exam/${exam.id}/overview`)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#003466] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#0b457e]"
                      >
                        <PlayCircle size={12} />
                        {"V\u00e0o l\u00e0m b\u00e0i"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="flex justify-center pt-2">
              <Pagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
