import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUp, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { extractApiErrorMessage } from "@/lib/error-utils";
import { parseDraftJson, premiumCompetitionService } from "@/features/user/services/premium-competition.service";
import type { ExamDraft, ExamDraftQuestion, ExamImportJob } from "@/features/user/types/premium-competition.type";

const SUBJECT_OPTIONS = [
  "Toán",
  "Ngữ văn",
  "Tiếng Anh",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Lịch sử",
  "Địa lý",
  "Giáo dục kinh tế và pháp luật",
  "Tin học",
  "Công nghệ",
  "Giáo dục quốc phòng và an ninh",
];

const CLASS_OPTIONS = ["Lớp 10", "Lớp 11", "Lớp 12"];

const emptyQuestion = (orderIndex: number): ExamDraftQuestion => ({
  content: "",
  type: "MCQ",
  options: ["", "", "", ""],
  answer: "A",
  answerExplanation: "",
  difficulty: 1,
  maxScore: 1,
  orderIndex,
  needsReview: true,
  imageUrl: null,
  imageUrls: [],
});

const generateAccessCode = () => `EXAM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const STORAGE_PUBLIC_ENDPOINT = (
  import.meta.env.VITE_STORAGE_PUBLIC_ENDPOINT ??
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_MINIO_PUBLIC_ENDPOINT ??
  "http://localhost:8080"
).replace(/\/+$/, "");

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const isPendingImportStatus = (status: string | undefined) => {
  const normalized = (status ?? "").toUpperCase();
  return normalized === "UPLOADED" || normalized === "EXTRACTING" || normalized === "EXTRACTED";
};

const toPublicStorageUrl = (fileUrl?: string | null): string | null => {
  if (!fileUrl) {
    return null;
  }
  const normalized = fileUrl.trim();
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  if (normalized.startsWith("/")) {
    return `${STORAGE_PUBLIC_ENDPOINT}${normalized}`;
  }
  if (!normalized.startsWith("storage://")) {
    return `${STORAGE_PUBLIC_ENDPOINT}/${normalized.replace(/^\/+/, "")}`;
  }

  const pathWithoutScheme = normalized.slice("storage://".length);
  const firstSlash = pathWithoutScheme.indexOf("/");
  if (firstSlash <= 0) {
    return null;
  }

  const bucket = pathWithoutScheme.slice(0, firstSlash);
  const objectKey = pathWithoutScheme.slice(firstSlash + 1);
  return `${STORAGE_PUBLIC_ENDPOINT}/api/v1/storage/${encodeURIComponent(bucket)}?key=${encodeURIComponent(objectKey)}`;
};

export default function PremiumExamImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [className, setClassName] = useState("Lớp 12");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [subjectName, setSubjectName] = useState(SUBJECT_OPTIONS[0]);
  const [job, setJob] = useState<ExamImportJob | null>(null);
  const [draft, setDraft] = useState<ExamDraft | null>(null);
  const [accessCode, setAccessCode] = useState(generateAccessCode());
  const [competitionPassword, setCompetitionPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isPollingImport, setIsPollingImport] = useState(false);
  const [questionUploadBusy, setQuestionUploadBusy] = useState<Record<number, boolean>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reviewCount = useMemo(() => draft?.questions.filter((question) => question.needsReview).length ?? 0, [draft]);

  const applyCompletedJob = (completedJob: ExamImportJob) => {
    setJob(completedJob);
    const parsedDraft = parseDraftJson(completedJob.draftJson);
    if (!parsedDraft) {
      throw new Error(completedJob.errorMessage || "Không thể tạo bản nháp từ file này.");
    }
    setDraft(parsedDraft);
    setMessage("Đã trích xuất xong nội dung văn bản. Hãy rà soát câu hỏi trước khi tạo cuộc thi.");
  };

  const pollImportJob = async (jobId: number) => {
    setIsPollingImport(true);
    try {
      for (let attempt = 0; attempt < 240; attempt += 1) {
        await sleep(1500);
        const latest = await premiumCompetitionService.getExamImport(jobId);
        setJob(latest);
        if (latest.status?.toUpperCase() === "FAILED") {
          throw new Error(latest.errorMessage || "Không thể trích xuất đề thi từ file này.");
        }
        if (!isPendingImportStatus(latest.status)) {
          applyCompletedJob(latest);
          return;
        }
      }
      throw new Error("Quá thời gian chờ trích xuất. Vui lòng tải lại trạng thái import sau.");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể import đề thi. Kiểm tra gói premium hoặc định dạng file."));
    } finally {
      setIsPollingImport(false);
    }
  };

  const upload = async () => {
    if (!file || !title.trim() || !subjectName.trim()) {
      setError("Vui lòng nhập tên đề, chọn môn học và chọn file.");
      return;
    }
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const uploaded = await premiumCompetitionService.uploadExamImport({
        file,
        title,
        subjectName: subjectName.trim(),
        className,
        durationMinutes,
      });
      setJob(uploaded);
      setDraft(null);
      if (isPendingImportStatus(uploaded.status)) {
        setMessage("Đã nhận file. Hệ thống đang trích xuất nội dung văn bản ở nền.");
        void pollImportJob(uploaded.id);
        return;
      }
      applyCompletedJob(uploaded);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể import đề thi. Kiểm tra gói premium hoặc định dạng file."));
    } finally {
      setIsBusy(false);
    }
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleUploadClick = () => {
    if (!file) {
      handlePickFile();
      return;
    }
    void upload();
  };

  const updateQuestion = (index: number, patch: Partial<ExamDraftQuestion>) => {
    setDraft((current) => {
      if (!current) return current;
      const questions = current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch, needsReview: false } : question,
      );
      return { ...current, questions };
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setDraft((current) => {
      if (!current) return current;
      const questions = current.questions.map((question, index) => {
        if (index !== questionIndex) return question;
        const options = [...question.options];
        options[optionIndex] = value;
        return { ...question, options, needsReview: false };
      });
      return { ...current, questions };
    });
  };

  const addQuestion = () => {
    setDraft((current) => {
      if (!current) return current;
      return { ...current, questions: [...current.questions, emptyQuestion(current.questions.length + 1)] };
    });
  };

  const removeQuestion = (index: number) => {
    setDraft((current) => {
      if (!current) return current;
      return { ...current, questions: current.questions.filter((_, questionIndex) => questionIndex !== index) };
    });
  };

  const uploadQuestionImage = async (index: number, selectedFile?: File | null) => {
    if (!job || !draft || !selectedFile) {
      return;
    }
    const orderIndex = draft.questions[index]?.orderIndex ?? index + 1;
    setQuestionUploadBusy((current) => ({ ...current, [orderIndex]: true }));
    setError("");
    try {
      const updated = await premiumCompetitionService.uploadQuestionImage(job.id, orderIndex, selectedFile);
      setJob(updated);
      const parsedDraft = parseDraftJson(updated.draftJson);
      if (!parsedDraft) {
        throw new Error("Không thể đọc lại bản nháp sau khi tải ảnh.");
      }
      setDraft(parsedDraft);
      setMessage(`Đã tải ảnh cho câu ${orderIndex}.`);
    } catch (err) {
      setError(extractApiErrorMessage(err, `Không thể tải ảnh cho câu ${orderIndex}.`));
    } finally {
      setQuestionUploadBusy((current) => ({ ...current, [orderIndex]: false }));
    }
  };

  const createCompetition = async () => {
    if (!job || !draft) return;
    if (!competitionPassword || competitionPassword.length < 6) {
      setError("Mật khẩu cuộc thi phải có ít nhất 6 ký tự.");
      return;
    }
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const confirmed = await premiumCompetitionService.confirmImport(job.id, draft);
      if (!confirmed.createdExamId) {
        throw new Error("Backend chưa trả về mã đề đã tạo.");
      }
      await premiumCompetitionService.createCompetition({
        examId: confirmed.createdExamId,
        title: draft.title,
        accessCode,
        password: competitionPassword,
        maxAttemptsPerUser: 1,
      });
      setMessage(`Đã tạo cuộc thi private với mã ${accessCode}.`);
      navigate("/user/premium/competitions");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể tạo cuộc thi private từ bản nháp này."));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Import đề bằng AI</h1>
            <p className="text-sm text-slate-500">Premium: trích xuất văn bản từ PDF/DOCX/HTML để tạo đề private.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/user/premium/competitions")}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <LockKeyhole size={16} /> Cuộc thi của tôi
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Tên đề
            <input className="rounded-md border border-slate-300 px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Môn học
            <select
              className="rounded-md border border-slate-300 px-3 py-2"
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
            >
              {SUBJECT_OPTIONS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Lớp
            <select
              className="rounded-md border border-slate-300 px-3 py-2"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
            >
              {CLASS_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Thời lượng (phút)
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-md border border-dashed border-slate-300 p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.html,.htm,.txt,.md"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              {file ? file.name : "Chưa chọn file"}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePickFile}
                disabled={isBusy}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
              >
                Chọn file
              </button>
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={isBusy}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <FileUp size={16} /> {isBusy ? "Đang upload..." : file ? "Upload và trích xuất" : "Chọn file để upload"}
              </button>
            </div>
          </div>
        </div>
        {isPollingImport && <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">Đang trích xuất nội dung văn bản trong nền...</p>}
        {message && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      {draft && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bản nháp câu hỏi</h2>
              <p className="text-sm text-slate-500">{draft.questions.length} câu, {reviewCount} câu cần rà soát.</p>
            </div>
            <button type="button" onClick={addQuestion} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">
              <Plus size={16} /> Thêm câu
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {draft.questions.map((question, index) => {
              const orderIndex = question.orderIndex ?? index + 1;
              const imageUrl = toPublicStorageUrl(question.imageUrl ?? question.imageUrls?.[0] ?? null);
              const isUploadingImage = questionUploadBusy[orderIndex] === true;

              return (
                <article key={index} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-700">Câu {index + 1}</span>
                    <button type="button" onClick={() => removeQuestion(index)} className="rounded-md p-2 text-red-600 hover:bg-red-50" aria-label="Xóa câu">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <textarea
                    className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={question.content}
                    onChange={(event) => updateQuestion(index, { content: event.target.value })}
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      {isUploadingImage ? "Đang tải ảnh..." : "Tải ảnh cho câu"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingImage || isBusy}
                        onChange={(event) => {
                          const selectedFile = event.target.files?.[0] ?? null;
                          void uploadQuestionImage(index, selectedFile);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {imageUrl && (
                    <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                      <img src={imageUrl} alt={`Ảnh câu ${index + 1}`} className="max-h-64 w-full object-contain bg-white" />
                    </div>
                  )}

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={question.type} onChange={(event) => updateQuestion(index, { type: event.target.value as ExamDraftQuestion["type"] })}>
                      <option value="MCQ">Trắc nghiệm</option>
                      <option value="FILL_IN_BLANK">Điền đáp án</option>
                      <option value="TRUE_FALSE">Đúng/Sai</option>
                    </select>
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={question.answer} onChange={(event) => updateQuestion(index, { answer: event.target.value })} placeholder="Đáp án" />
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min={0.25} step={0.25} value={question.maxScore ?? 1} onChange={(event) => updateQuestion(index, { maxScore: Number(event.target.value) })} />
                  </div>

                  {question.type === "MCQ" && (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <input key={optionIndex} className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={option} onChange={(event) => updateOption(index, optionIndex, event.target.value)} placeholder={`${String.fromCharCode(65 + optionIndex)}.`} />
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Mã cuộc thi
              <input className="rounded-md border border-slate-300 px-3 py-2 uppercase" value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Mật khẩu
              <input className="rounded-md border border-slate-300 px-3 py-2" type="password" value={competitionPassword} onChange={(event) => setCompetitionPassword(event.target.value)} />
            </label>
            <button type="button" onClick={createCompetition} disabled={isBusy} className="mt-auto rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
              Tạo đề và cuộc thi private
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
