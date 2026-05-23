import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { FileUp, LockKeyhole, X } from "lucide-react";
import { extractApiErrorMessage } from "@/lib/error-utils";
import { parseDraftJson, premiumCompetitionService } from "@/features/user/services/premium-competition.service";
import type { ExamDraft, ExamDraftQuestion, ExamImportAsset, ExamImportJob } from "@/features/user/types/premium-competition.type";

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

const assetImageId = (asset: ExamImportAsset, index: number) => asset.imageId ?? `image${asset.extractionOrder ?? index + 1}`;

const assetUrl = (asset?: ExamImportAsset | null): string | null => {
  if (!asset) {
    return null;
  }
  return asset.previewUrl ?? toPublicStorageUrl(asset.fileUrl) ?? null;
};

function LatexMarkdownPreview({ content }: { content: string }) {
  const safeContent = content?.trim() ? content : "_Chưa có nội dung._";

  try {
    return (
      <div className="exam-import-question-body prose prose-sm max-w-none rounded-md border border-slate-200 bg-slate-50 p-3 text-[15px] leading-relaxed text-slate-800 [&_.katex-display]:overflow-x-auto">
        <ReactMarkdown
          remarkPlugins={[[remarkMath, { singleDollarTextMath: true }]]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
        >
          {safeContent}
        </ReactMarkdown>
      </div>
    );
  } catch {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Một phần công thức chưa render được. Nội dung gốc vẫn được giữ nguyên trong hệ thống.
      </div>
    );
  }
}

const questionAssets = (assets: ExamImportAsset[], question: ExamDraftQuestion, index: number) => {
  const orderIndex = question.orderIndex ?? index + 1;
  const detectedNumber = question.detectedNumber ?? orderIndex;
  return assets.filter((asset) => {
    const linked = asset.linkedQuestionOrder;
    if (linked == null || linked <= 0) {
      return false;
    }
    return linked === detectedNumber || linked === orderIndex;
  });
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
  const [previewAsset, setPreviewAsset] = useState<ExamImportAsset | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const extractedAssets = useMemo(() => job?.assets ?? [], [job]);

  const applyCompletedJob = (completedJob: ExamImportJob) => {
    setJob(completedJob);
    const parsedDraft = parseDraftJson(completedJob.draftJson);
    if (!parsedDraft) {
      throw new Error(completedJob.errorMessage || "Không thể tạo bản nháp từ file này.");
    }
    setDraft(parsedDraft);
    setMessage("Đã trích xuất xong. Kiểm tra nội dung LaTeX và chọn ảnh minh họa cho từng câu trước khi tạo đề.");
  };

  const pollImportJob = async (jobId: number) => {
    setIsPollingImport(true);
    try {
      const deadline = Date.now() + 45 * 60 * 1000;
      while (Date.now() < deadline) {
        await sleep(2000);
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
      throw new Error("Quá thời gian chờ trích xuất. Vui lòng tải lại trang và kiểm tra lại job import.");
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
        setMessage("Đã nhận file. Đang trích xuất tối đa 10 trang đầu (text + công thức + ảnh theo câu).");
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

  const updateQuestionSelectedImages = (questionIndex: number, selectedImageIds: string[]) => {
    const selectedUrls = selectedImageIds
      .map((imageId) => {
        const asset = extractedAssets.find((item, assetIndex) => assetImageId(item, assetIndex) === imageId);
        return assetUrl(asset);
      })
      .filter((url): url is string => Boolean(url));

    updateQuestion(questionIndex, {
      selectedImageIds,
      imageUrls: selectedUrls,
      imageUrl: selectedUrls[0] ?? null,
    });
  };

  const toggleQuestionImage = (questionIndex: number, imageId: string) => {
    const question = draft?.questions[questionIndex];
    if (!question) return;
    const current = new Set(question.selectedImageIds ?? []);
    if (current.has(imageId)) {
      current.delete(imageId);
    } else {
      current.add(imageId);
    }
    updateQuestionSelectedImages(questionIndex, Array.from(current));
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
            accept=".pdf,.doc,.docx,.html,.htm,.txt,.md,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff"
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
        {isPollingImport && (
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-3">
            <div className="mb-2 flex items-center justify-between text-sm text-blue-800">
              <span>{job?.progressMessage ?? "Đang trích xuất (tối đa 10 trang đầu)..."}</span>
              <span>{job?.progressPercent ?? 5}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${Math.max(5, job?.progressPercent ?? 5)}%` }}
              />
            </div>
          </div>
        )}
        {message && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      {job && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-slate-900">Ảnh đã trích xuất</h2>
            <p className="text-sm text-slate-500">
              {extractedAssets.length > 0
                ? `Có ${extractedAssets.length} ảnh minh họa (crop theo câu, không phải ảnh cả trang). Chọn ảnh trong từng câu hỏi bên dưới.`
                : "Chưa trích xuất được ảnh minh họa riêng từ tài liệu này."}
            </p>
          </div>

          {extractedAssets.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {extractedAssets.map((asset, index) => {
                const imageId = assetImageId(asset, index);
                const previewUrl = assetUrl(asset);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setPreviewAsset(asset)}
                    className="overflow-hidden rounded-md border border-slate-200 bg-white text-left shadow-sm hover:border-blue-300"
                  >
                    <div className="flex h-36 items-center justify-center bg-slate-50">
                      {previewUrl ? (
                        <img src={previewUrl} alt={imageId} className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-sm text-slate-400">Không có preview</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="font-semibold text-slate-800">{imageId}</span>
                      <span className="text-xs text-slate-500">Trang {asset.originalPage ?? asset.pageNo ?? "-"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              Bạn vẫn có thể tải ảnh thủ công trong từng câu hỏi nếu tài liệu không có asset ảnh riêng.
            </div>
          )}
        </section>
      )}

      {draft && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Bản nháp câu hỏi</h2>
            <p className="text-sm text-slate-500">
              {draft.questions.length} câu · Nội dung và đáp án đã khóa · Chỉ chọn ảnh minh họa cho từng câu.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {draft.questions.map((question, index) => {
              const relatedAssets = questionAssets(extractedAssets, question, index);
              const selectedIds = new Set(question.selectedImageIds ?? []);

              return (
                <article key={index} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3">
                    <span className="text-sm font-bold text-slate-700">Câu {question.detectedNumber ?? index + 1}</span>
                  </div>

                  <LatexMarkdownPreview content={question.latexContent ?? question.content} />

                  {question.type === "MCQ" && question.options.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="rounded-md border border-slate-100 bg-white p-2">
                          <div className="mb-1 text-xs font-bold text-slate-500">{String.fromCharCode(65 + optionIndex)}.</div>
                          <LatexMarkdownPreview content={option} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    <span className="font-semibold">Đáp án: </span>
                    {question.answer?.trim() ? question.answer : "—"}
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 text-sm font-semibold text-slate-700">Ảnh minh họa cho câu này (chọn/bỏ chọn)</div>
                    {relatedAssets.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {relatedAssets.map((asset) => {
                          const assetIndex = extractedAssets.indexOf(asset);
                          const imageId = assetImageId(asset, assetIndex >= 0 ? assetIndex : 0);
                          const selected = selectedIds.has(imageId);
                          const preview = assetUrl(asset);
                          return (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() => toggleQuestionImage(index, imageId)}
                              className={`overflow-hidden rounded-md border text-left transition ${
                                selected ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex h-32 items-center justify-center bg-white">
                                {preview ? <img src={preview} alt={imageId} className="h-full w-full object-contain" /> : null}
                              </div>
                              <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-600">
                                <span>{imageId}</span>
                                <span className={selected ? "text-blue-600" : "text-slate-400"}>{selected ? "Đã chọn" : "Chọn"}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Không có ảnh minh họa tự động cho câu này.</p>
                    )}
                  </div>
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

      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div className="font-bold text-slate-900">
                  {previewAsset.imageId ?? `image${previewAsset.extractionOrder ?? ""}`}
                </div>
                <div className="text-xs text-slate-500">
                  Trang {previewAsset.originalPage ?? previewAsset.pageNo ?? "-"}
                  {previewAsset.width && previewAsset.height ? ` · ${previewAsset.width}x${previewAsset.height}` : ""}
                </div>
              </div>
              <button type="button" onClick={() => setPreviewAsset(null)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng preview ảnh">
                <X size={18} />
              </button>
            </div>
            <div className="flex max-h-[76vh] items-center justify-center bg-slate-950 p-4">
              {assetUrl(previewAsset) ? (
                <img src={assetUrl(previewAsset) ?? ""} alt={previewAsset.imageId ?? "preview"} className="max-h-[72vh] max-w-full object-contain" />
              ) : (
                <div className="text-sm text-white">Không có preview ảnh.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
