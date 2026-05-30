import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Crown, ListChecks, Lock, PlayCircle, ShieldCheck, Timer, Trophy } from "lucide-react";
import { examService } from "@/features/user/services/user.service";
import type { ExamListItem } from "@/features/user/types/user.type";
import { getStoredAuthToken } from "@/lib/api-client";

function toDisplayDateTime(value?: string | null) {
  if (!value) return "Chưa cấu hình";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cấu hình";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getWindowState(exam: ExamListItem, nowMs: number) {
  const normalizedStatus = String(exam.status ?? "").trim().toUpperCase();
  const startMs = exam.startAt ? new Date(exam.startAt).getTime() : null;
  const endMs = exam.endAt ? new Date(exam.endAt).getTime() : null;
  const hasValidStart = typeof startMs === "number" && !Number.isNaN(startMs);
  const hasValidEnd = typeof endMs === "number" && !Number.isNaN(endMs);

  if (normalizedStatus === "LOCKED") {
    return { canStart: false, message: "Bài thi đang bị khóa bởi quản trị viên." };
  }

  if (normalizedStatus === "CLOSED") {
    return { canStart: false, message: "Bài thi đã hết thời gian mở." };
  }

  if (normalizedStatus && normalizedStatus !== "PUBLISHED" && normalizedStatus !== "ONGOING") {
    return { canStart: false, message: "Bài thi hiện chưa sẵn sàng cho thí sinh." };
  }

  if (hasValidStart && nowMs < startMs) {
    return { canStart: false, message: "Bài thi chưa được mở." };
  }

  if (hasValidEnd && nowMs > endMs) {
    return { canStart: false, message: "Bài thi đã hết thời gian mở." };
  }

  return { canStart: true, message: "Đã đến thời gian cho phép làm bài." };
}

export default function OnlineExamIntroPage() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [exam, setExam] = useState<ExamListItem | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [previewQuestions, setPreviewQuestions] = useState<string[]>([]);
  const [lockedQuestionCount, setLockedQuestionCount] = useState(0);
  const [attempts, setAttempts] = useState<
    Array<{
      sessionId: number;
      startedAt: string | null;
      submittedAt: string | null;
      totalScore: number;
      durationSeconds: number | null;
    }>
  >([]);

  const normalizeClassLabel = (value?: string | null) => {
    if (!value) return "Chưa cập nhật";
    const trimmed = value.trim();
    const normalized = trimmed.replace(/^l(?:ớ|o)p\s*/i, "");
    return normalized || trimmed;
  };

  useEffect(() => {
    if (!getStoredAuthToken()) {
      navigate("/login", { replace: true });
      return;
    }

    const id = Number(examId);
    if (Number.isNaN(id)) {
      setIsLoading(false);
      setExam(null);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const [data, previewExam] = await Promise.all([
          examService.getExamListItemById(id),
          examService.getExamPreview(id),
        ]);
        setExam(data);
        const myAttempts = await examService.getMyExamAttempts(id);
        setAttempts(myAttempts);

        if (previewExam) {
          setQuestionCount(previewExam.totalQuestionCount ?? previewExam.questions.length);
          setPreviewQuestions(previewExam.questions.map((item) => item.question));
          setLockedQuestionCount(previewExam.lockedQuestionCount ?? 0);
          const totalScore = previewExam.questions.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
          setMaxScore(totalScore);
        } else {
          setQuestionCount(0);
          setMaxScore(0);
          setPreviewQuestions([]);
          setLockedQuestionCount(0);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [examId, navigate]);

  const availability = useMemo(() => {
    if (!exam) {
      return { canStart: false, message: "Không tìm thấy đề thi hoặc đề chưa được công khai." };
    }
    if (exam.requiresUnlock) {
      return { canStart: false, message: exam.vip ? "Đây là đề VIP. Mở khóa bằng coin hoặc dùng premium để làm bài." : "Mở khóa đề để xem và làm toàn bộ nội dung." };
    }
    return getWindowState(exam, Date.now());
  }, [exam]);

  const handleUnlock = async () => {
    if (!exam || isUnlocking) return;

    setIsUnlocking(true);
    setUnlockError("");
    try {
      await examService.unlockExam(exam.id);
      const [nextExam, fullExam] = await Promise.all([
        examService.getExamListItemById(exam.id),
        examService.getExamById(String(exam.id)),
      ]);
      setExam(nextExam);
      setQuestionCount(fullExam?.questions.length ?? 0);
      setPreviewQuestions(fullExam?.questions.slice(0, 1).map((item) => item.question) ?? []);
      setLockedQuestionCount(fullExam?.requiresUnlock ? fullExam.lockedQuestionCount ?? 0 : 0);
      setMaxScore(fullExam?.questions.reduce((sum, item) => sum + (Number(item.score) || 0), 0) ?? 0);
    } catch {
      setUnlockError("Khong the mo khoa de VIP. Vui long kiem tra coin hoac nang cap premium.");
    } finally {
      setIsUnlocking(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Đang tải thông tin đề thi...</div>;
  }

  if (!exam) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800">
        Không tìm thấy đề thi hoặc đề chưa được công khai.
      </div>
    );
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return "--";
    const minutes = Math.round(seconds / 60);
    return `${minutes} phút`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-2xl border border-[#c7e6e2] bg-white/90 p-4 shadow-sm md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-2.5">
            <span className="inline-flex rounded-full bg-[#bdece5] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#0f5c6e]">
              Đề thi chính thức
            </span>
            {exam.vip ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                <Crown size={12} className="fill-current" />
                VIP
              </span>
            ) : null}
            <h1 className="text-[1.7rem] font-black leading-tight text-[#083c72]">{exam.title}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.83rem] font-semibold text-slate-600">
              <span>Môn học: <strong className="text-slate-800">{exam.subjectName || "Chưa cập nhật"}</strong></span>
              <span>Lớp: <strong className="text-slate-800">{normalizeClassLabel(exam.className ?? exam.educationLevelName)}</strong></span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.83rem] font-semibold text-slate-600">
              <span>Thời gian bắt đầu: <strong className="text-slate-800">{toDisplayDateTime(exam.startAt)}</strong></span>
              <span>Thời gian kết thúc: <strong className="text-slate-800">{toDisplayDateTime(exam.endAt)}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#bdece5] p-4 text-center">
              <ListChecks className="mx-auto mb-1 text-[#0b4d7c]" size={16} />
              <p className="text-3xl font-black text-[#05355d]">{questionCount}</p>
              <p className="text-xs font-semibold text-[#215877]">Câu hỏi</p>
            </div>
            <div className="rounded-xl bg-[#bdece5] p-4 text-center">
              <Timer className="mx-auto mb-1 text-[#b45309]" size={16} />
              <p className="text-3xl font-black text-[#05355d]">{exam.durationMinutes ?? 30}</p>
              <p className="text-xs font-semibold text-[#215877]">Phút</p>
            </div>
            <div className="col-span-2 rounded-xl bg-[#bdece5] p-4 text-center">
              <Trophy className="mx-auto mb-1 text-[#854d0e]" size={16} />
              <p className="text-3xl font-black text-[#05355d]">{maxScore}</p>
              <p className="text-xs font-semibold text-[#215877]">Điểm tối đa</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[7fr_3fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#c7e6e2] bg-white/90 p-4 md:p-5">
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Xem trước</p>
              {previewQuestions.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {previewQuestions.map((content, index) => (
                    <div
                      key={`${content}-${index}`}
                      className="rounded-lg bg-white p-3 text-sm font-semibold leading-relaxed text-slate-700 shadow-sm"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  ))}
                  {lockedQuestionCount > 0 ? (
                    <div className="relative overflow-hidden rounded-lg border border-dashed border-amber-200 bg-white p-4">
                      <div className="space-y-2 blur-[2px]">
                        <div className="h-3 w-11/12 rounded bg-slate-200" />
                        <div className="h-3 w-9/12 rounded bg-slate-200" />
                        <div className="h-3 w-10/12 rounded bg-slate-200" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
                          <Lock size={13} /> {lockedQuestionCount} câu còn lại cần mở khóa
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm font-semibold text-slate-500">Chưa có câu hỏi xem trước.</p>
              )}
            </div>
            {exam.requiresUnlock ? (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-900">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-amber-900">
                    <Lock size={16} />
                  </span>
                  <div>
                    <p className="font-black">{exam.vip ? "Đề VIP cần mở khóa" : "Đề cần mở khóa"}</p>
                    <p className="mt-1 text-xs text-amber-800">
                      Tài khoản premium được truy cập tự do. User thường sẽ bị trừ {exam.unlockCoinCost ?? (exam.vip ? 50 : 10)} coin.
                    </p>
                  </div>
                </div>
                {unlockError ? <p className="text-xs text-red-700">{unlockError}</p> : null}
                <button
                  onClick={() => void handleUnlock()}
                  disabled={isUnlocking}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-xs font-black text-amber-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Crown size={14} />
                  {isUnlocking ? "Đang mở khóa..." : `${exam.vip ? "Mở khóa VIP" : "Mở khóa"} (${exam.unlockCoinCost ?? (exam.vip ? 50 : 10)} coin)`}
                </button>
              </div>
            ) : availability.canStart ? (
              <div className="flex justify-center">
                <button
                  onClick={() => navigate(`/user/exam/${exam.id}`)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0b4d7c] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0a4169]"
                >
                  Bắt đầu làm bài ngay <PlayCircle size={14} />
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                <span className="inline-flex items-center gap-2"><AlertCircle size={16} /> {availability.message}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#c7e6e2] bg-white/90 p-4 md:p-5">
            <h2 className="text-2xl font-bold text-[#123b67]">Attempt History</h2>
            {attempts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Bạn chưa có lịch sử làm đề này.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-[#123b67]">
                      <th className="px-2 py-2 text-sm font-bold"></th>
                      <th className="px-2 py-2 text-sm font-bold">Attempt</th>
                      <th className="px-2 py-2 text-sm font-bold">Time</th>
                      <th className="px-2 py-2 text-sm font-bold">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((item, index) => (
                      <tr key={item.sessionId} className="border-b border-slate-200">
                        <td className="px-2 py-2 text-sm font-bold text-[#123b67]">{index === 0 ? "LATEST" : ""}</td>
                        <td className="px-2 py-2 text-sm">
                          <button
                            onClick={() => navigate(`/user/exambank/examreview?sessionId=${item.sessionId}&examId=${exam.id}`)}
                            className="font-semibold text-[#0b4d7c] hover:underline"
                          >
                            Attempt {attempts.length - index}
                          </button>
                        </td>
                        <td className="px-2 py-2 text-sm text-slate-700">{formatDuration(item.durationSeconds)}</td>
                        <td className="px-2 py-2 text-sm text-slate-700">{item.totalScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-[#d4ebe8] bg-[#f4fbfa] p-4">
          <p className="mb-3 text-sm font-extrabold text-[#b45309]">Lưu ý quan trọng</p>
          <ul className="space-y-3 text-xs text-slate-700">
            <li className="flex gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#bdece5]">
                <ShieldCheck size={12} className="text-[#0b4d7c]" />
              </span>
              <span><strong className="text-slate-900">Không chuyển Tab</strong><br />Hệ thống ghi nhận vi phạm nếu bạn rời khỏi màn hình bài thi.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#bdece5]">
                <ShieldCheck size={12} className="text-[#0b4d7c]" />
              </span>
              <span><strong className="text-slate-900">Tự động nộp bài</strong><br />Bài làm sẽ tự động được gửi đi khi thời gian làm bài kết thúc.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#bdece5]">
                <ShieldCheck size={12} className="text-[#0b4d7c]" />
              </span>
              <span><strong className="text-slate-900">Kết nối mạng</strong><br />Đảm bảo kết nối internet ổn định trong suốt quá trình làm bài.</span>
            </li>
          </ul>
        </aside>
      </section>
    </div>
  );
}


