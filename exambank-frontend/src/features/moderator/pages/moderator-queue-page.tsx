import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Maximize2,
  Search,
  X,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Input } from "@/components/ui/Input/input";
import { Modal } from "@/components/ui/Modal/modal";
import {
  approveModeratorQueueItem,
  listModeratorQueueItems,
  rejectModeratorQueueItem,
  type ModeratorQueueRecord,
} from "@/features/moderator/services/moderator-queue.service";

const DEFAULT_TAGS = ["Lớp 12", "HK1"];

const quickReasons = [
  {
    title: "Nội dung không rõ ràng",
    detail: "Ảnh mờ, mất chữ hoặc không đầy đủ câu hỏi.",
  },
  {
    title: "Tài liệu trùng lặp",
    detail: "Tài liệu này đã tồn tại trên hệ thống.",
  },
  {
    title: "Sai phân loại",
    detail: "Môn học hoặc khối lớp không đúng với nội dung.",
  },
];

function riskClassName(risk: string) {
  if (risk === "Cao") {
    return "bg-rose-100 text-rose-700";
  }

  if (risk === "Vừa") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function clampDifficulty(value: number) {
  if (!Number.isFinite(value)) {
    return 5;
  }

  return Math.max(0, Math.min(10, Math.round(value)));
}

function pickPreviewImageBySubject(subject: string) {
  const normalized = normalizeText(subject);

  if (normalized.includes("toan")) {
    return "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=700&q=60";
  }

  if (normalized.includes("vat ly") || normalized.includes("ly")) {
    return "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=700&q=60";
  }

  if (normalized.includes("hoa")) {
    return "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=700&q=60";
  }

  return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=700&q=60";
}

function extractApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAxiosError(error)) {
    const payload = error.response?.data;

    if (typeof payload === "string" && payload.trim().length > 0) {
      return payload;
    }

    if (payload && typeof payload === "object") {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === "string" && message.trim().length > 0) {
        return message;
      }
    }

    if (typeof error.message === "string" && error.message.trim().length > 0) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export default function ModeratorQueuePage() {
  const [subject, setSubject] = useState("Tất cả");
  const [level, setLevel] = useState("Tất cả");
  const [schoolKeyword, setSchoolKeyword] = useState("");
  const [globalKeyword, setGlobalKeyword] = useState("");

  const [queueItems, setQueueItems] = useState<ModeratorQueueRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const currentPage = 1;
  const totalPages = 1;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [quickReason, setQuickReason] = useState("");

  const [metadataTitle, setMetadataTitle] = useState("");
  const [metadataCategory, setMetadataCategory] = useState("Đề thi học kỳ");

  const [tags, setTags] = useState<string[]>(DEFAULT_TAGS);
  const [tagInput, setTagInput] = useState("");
  const [difficultyValue, setDifficultyValue] = useState(5);
  const [difficultyNotice, setDifficultyNotice] = useState("");

  const refreshQueue = useCallback(async (refreshingState = false) => {
    if (refreshingState) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
      const records = await listModeratorQueueItems();
      setQueueItems(records);
      setSelectedId((current) => {
        if (current && records.some((item) => item.id === current)) {
          return current;
        }

        return records[0]?.id ?? null;
      });
    } catch (error) {
      setQueueItems([]);
      setSelectedId(null);
      setErrorMessage(extractApiErrorMessage(error, "Không thể tải hàng đợi kiểm duyệt."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshQueue(false);
  }, [refreshQueue]);

  const subjectOptions = useMemo(() => {
    const subjects = Array.from(new Set(queueItems.map((item) => item.subject)));
    return ["Tất cả", ...subjects.sort((first, second) => first.localeCompare(second, "vi"))];
  }, [queueItems]);

  const filteredQueue = useMemo(() => {
    const normalizedGlobalKeyword = normalizeText(globalKeyword);
    const normalizedSchoolKeyword = normalizeText(schoolKeyword);

    return queueItems.filter((item) => {
      const bySubject = subject === "Tất cả" || item.subject === subject;
      const byLevel = level === "Tất cả" || item.level === level;
      const bySchool =
        normalizedSchoolKeyword.length === 0 ||
        normalizeText(item.school).includes(normalizedSchoolKeyword);
      const byKeyword =
        normalizedGlobalKeyword.length === 0 ||
        normalizeText(item.title).includes(normalizedGlobalKeyword) ||
        normalizeText(item.uploader).includes(normalizedGlobalKeyword);

      return bySubject && byLevel && bySchool && byKeyword;
    });
  }, [globalKeyword, level, queueItems, schoolKeyword, subject]);

  const selected = useMemo(() => {
    if (filteredQueue.length === 0) {
      return null;
    }

    return filteredQueue.find((item) => item.id === selectedId) ?? filteredQueue[0];
  }, [filteredQueue, selectedId]);

  useEffect(() => {
    if (!selected) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }

    if (selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  useEffect(() => {
    if (!selected) {
      setMetadataTitle("");
      setMetadataCategory("Đề thi học kỳ");
      setTags(DEFAULT_TAGS);
      setDifficultyValue(5);
      setDifficultyNotice("");
      return;
    }

    setMetadataTitle(selected.title);
    setMetadataCategory(selected.category || "Đề thi học kỳ");
    setTags(selected.tags.length > 0 ? selected.tags : DEFAULT_TAGS);
    setDifficultyValue(clampDifficulty(selected.estimatedDifficulty ?? 5));
    setDifficultyNotice("");
  }, [selected]);

  function addTag() {
    const next = tagInput.trim();
    if (!next || tags.includes(next)) {
      setTagInput("");
      return;
    }

    setTags((previous) => [...previous, next]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((previous) => previous.filter((item) => item !== tag));
  }

  function handleDifficultyChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = clampDifficulty(Number(event.target.value));
    setDifficultyValue(nextValue);
    setDifficultyNotice(`Đã cập nhật độ khó: ${nextValue}/10.`);
  }

  function handleSelectDifficultyPreset(value: number) {
    const nextValue = clampDifficulty(value);
    setDifficultyValue(nextValue);
    setDifficultyNotice(`Đã chọn mức độ khó: ${nextValue}/10.`);
  }

  function openRejectModal() {
    if (!selected || isActionRunning) {
      return;
    }

    setQuickReason("");
    setRejectReason("");
    setRejectOpen(true);
  }

  async function handleApprove() {
    if (!selected || isActionRunning) {
      return;
    }

    const shouldApprove = window.confirm(`Duyệt tài liệu "${selected.title}"?`);
    if (!shouldApprove) {
      return;
    }

    setIsActionRunning(true);

    try {
      await approveModeratorQueueItem(selected);
      await refreshQueue(true);
    } catch (error) {
      window.alert(extractApiErrorMessage(error, "Duyệt tài liệu thất bại."));
    } finally {
      setIsActionRunning(false);
    }
  }

  async function confirmReject() {
    if (!selected || isActionRunning) {
      return;
    }

    const finalReason = rejectReason.trim() || quickReason.trim();
    if (!finalReason) {
      window.alert("Vui lòng chọn hoặc nhập lý do từ chối.");
      return;
    }

    setIsActionRunning(true);

    try {
      await rejectModeratorQueueItem(selected, finalReason);
      setRejectOpen(false);
      setQuickReason("");
      setRejectReason("");
      await refreshQueue(true);
    } catch (error) {
      window.alert(extractApiErrorMessage(error, "Từ chối tài liệu thất bại."));
    } finally {
      setIsActionRunning(false);
    }
  }

  const difficultyPercent = `${(difficultyValue / 10) * 100}%`;
  const difficultyLabel =
    difficultyValue <= 3 ? "Dễ" : difficultyValue <= 7 ? "Trung bình" : "Khó";
  const canRunActions = Boolean(selected) && !isActionRunning && !isRefreshing;

  return (
    <div className="relative min-h-[78vh] overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-[#f7f9fb] shadow-[0_16px_40px_rgba(16,21,38,0.08)]">
      <div className="flex min-h-[78vh] flex-col xl:flex-row">
        <section className="w-full border-r border-[#e5e7eb] bg-[#f2f4f6] xl:w-[420px]">
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#1a4b84]">Hàng đợi kiểm duyệt</h2>
              <span className="rounded-full bg-[#1a4b84] px-2 py-1 text-[10px] font-bold text-white">
                {filteredQueue.length} cần duyệt
              </span>
            </div>

            <Input
              placeholder="Tìm kiếm tài liệu..."
              value={globalKeyword}
              onChange={(event) => setGlobalKeyword(event.target.value)}
              startAdornment={<Search size={15} className="text-slate-400" />}
              inputWrapperClassName="rounded-full border-none bg-white shadow-sm"
              inputClassName="h-10 text-sm"
            />

            <div className="flex gap-2">
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="h-10 flex-1 rounded-lg border-none bg-white px-3 text-xs font-medium shadow-sm outline-none"
              >
                {subjectOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="h-10 flex-1 rounded-lg border-none bg-white px-3 text-xs font-medium shadow-sm outline-none"
              >
                <option>Tất cả</option>
                <option>THPT</option>
                <option>THCS</option>
              </select>
            </div>

            <Input
              value={schoolKeyword}
              onChange={(event) => setSchoolKeyword(event.target.value)}
              placeholder="Lọc theo trường"
              inputClassName="h-10 text-sm"
              inputWrapperClassName="border-none bg-white shadow-sm"
            />

            <div className="flex items-center justify-between gap-2">
              {errorMessage ? <p className="text-xs font-semibold text-rose-600">{errorMessage}</p> : <span />}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void refreshQueue(true)}
                disabled={isRefreshing || isLoading}
                className="h-8 rounded-lg border-none bg-white/80"
              >
                {isRefreshing ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" /> Đang tải...
                  </span>
                ) : (
                  "Tải lại"
                )}
              </Button>
            </div>
          </div>

          <div className="max-h-[58vh] space-y-3 overflow-y-auto px-4 pb-6">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-sm font-semibold text-slate-500">
                <Loader2 size={16} className="mr-2 animate-spin" /> Đang tải dữ liệu...
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-500">
                Không có tài liệu nào trong hàng đợi theo bộ lọc hiện tại.
              </div>
            ) : (
              filteredQueue.map((item) => {
                const active = item.id === selected?.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-2xl p-3 text-left transition ${
                      active
                        ? "border-2 border-[#bdd2f5] bg-white shadow-sm"
                        : "border border-transparent bg-[#ffffffcc] hover:bg-white"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <img
                          src={pickPreviewImageBySubject(item.subject)}
                          alt="Xem trước tài liệu"
                          className="h-full w-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 grid place-items-center">
                          <FileText size={14} className="text-slate-500" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#006e2f]">{item.subject}</span>
                          <span className="whitespace-nowrap text-[10px] italic text-slate-400">{item.uploadedAt}</span>
                        </div>
                        <h3 className="truncate text-sm font-bold text-[var(--ink-900)]">{item.title}</h3>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          Người đăng: <span className="font-medium text-[var(--ink-900)]">{item.uploader}</span>
                        </p>
                        <p className="mt-1 truncate text-[11px] text-rose-600">
                          Báo cáo: <span className="font-semibold">{item.reportReason}</span> · {item.reporterName}
                        </p>
                        <div className="mt-2 flex gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${riskClassName(item.duplicateRisk)}`}>
                            Trùng lặp?
                          </span>
                          {item.hasReport ? (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">Báo cáo</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="relative flex min-w-0 flex-1 flex-col bg-[#f7f9fb]">
          <div className="h-[56%] min-h-[20rem] bg-slate-200 p-5 pb-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Eye size={16} className="shrink-0 text-[#1a4b84]" />
                <span className="truncate text-sm font-bold tracking-[0.08em] text-[#1a4b84]">Xem chi tiết tài liệu</span>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="icon" className="h-9 w-9 rounded-lg border-none bg-white/80" disabled={!selected}>
                  <ZoomIn size={14} />
                </Button>
                <Button variant="secondary" size="icon" className="h-9 w-9 rounded-lg border-none bg-white/80" disabled={!selected}>
                  <Maximize2 size={14} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 rounded-lg border-none bg-white/80"
                  leftIcon={<Download size={13} />}
                  disabled={!selected}
                >
                  Tải file gốc
                </Button>
              </div>
            </div>

            <div className="mx-auto h-[calc(100%-2.5rem)] max-w-4xl overflow-hidden rounded-t-2xl bg-white p-6 shadow-2xl">
              <div className="h-full overflow-y-auto pr-2">
                <div className="space-y-4 text-center">
                  <h3 className="font-[var(--font-display)] text-xl font-black uppercase">Sở Giáo dục và Đào tạo TP.HCM</h3>
                  <p className="font-[var(--font-display)] text-lg font-bold uppercase">{selected?.school ?? "--"}</p>
                  <p className="text-sm font-bold uppercase">{selected?.title ?? "Chưa có tài liệu"}</p>
                  <p className="text-sm italic text-slate-600">
                    Thời gian làm bài: {selected?.durationMinutes ?? 90} phút (không kể thời gian giao đề)
                  </p>
                </div>

                <div className="mt-6 space-y-4 text-sm text-[var(--ink-900)]">
                  <p>
                    <strong>Câu 1 (1.0 điểm).</strong> Cho hàm số y = f(x) có bảng biến thiên như sau...
                  </p>
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs italic text-slate-400">
                    [Nội dung xem trước đang được render...]
                  </div>
                  <p>
                    <strong>Câu 2 (1.0 điểm).</strong> Tìm tất cả các giá trị của tham số m để đồ thị hàm số...
                  </p>
                  <p>
                    <strong>Câu 3 (1.0 điểm).</strong> Giải bất phương trình sau trên tập số thực...
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[44%] overflow-y-auto rounded-t-3xl bg-white p-6 pb-24 shadow-[0_-12px_40px_rgba(0,0,0,0.03)] xl:pr-28">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="rounded-2xl bg-[#d5e3ff] p-2.5 text-[#1a4b84]">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold leading-tight text-[#202739]">Kiểm duyệt metadata</h3>
                  <p className="text-xs font-medium text-[#7d869c]">Thông tin được nạp từ API moderator queue</p>
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold tracking-wide text-[#8a91a3]">Tiêu đề tài liệu</p>
                    <Input
                      value={metadataTitle}
                      onChange={(event) => setMetadataTitle(event.target.value)}
                      inputClassName="h-11 rounded-2xl border-none bg-[#eff1f5] px-4 text-sm font-semibold text-[#2f3546]"
                      inputWrapperClassName="border-none shadow-none"
                      disabled={!selected}
                    />
                  </div>

                  <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-4">
                    <div className="min-w-0 space-y-2">
                      <p className="text-[10px] font-extrabold tracking-wide text-[#8a91a3]">Danh mục</p>

                      <div className="relative">
                        <select
                          value={metadataCategory}
                          onChange={(event) => setMetadataCategory(event.target.value)}
                          className="h-11 w-full appearance-none rounded-2xl border-none bg-[#eff1f5] pl-4 pr-12 text-[13px] font-semibold text-[#3b4257] outline-none"
                          title={metadataCategory}
                          disabled={!selected}
                        >
                          <option>Đề thi học kỳ</option>
                          <option>Kiểm tra 1 tiết</option>
                          <option>Tài liệu ôn tập</option>
                        </select>

                        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#3b4257]">
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <path
                              d="M5 7.5L10 12.5L15 7.5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 space-y-2">
                      <p className="text-[10px] font-extrabold tracking-wide text-[#8a91a3]">Môn học</p>

                      <div className="relative">
                        <select
                          className="h-11 w-full appearance-none rounded-2xl border-none bg-[#eff1f5] pl-4 pr-12 text-[13px] font-semibold text-[#3b4257] outline-none"
                          title={selected?.subject ?? "Môn học"}
                          disabled
                          value={selected?.subject ?? "--"}
                          onChange={() => undefined}
                        >
                          <option>{selected?.subject ?? "--"}</option>
                        </select>

                        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#3b4257]">
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <path
                              d="M5 7.5L10 12.5L15 7.5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-extrabold tracking-wide text-[#8a91a3]">Thẻ tags</p>
                  <div className="min-h-[4.5rem] rounded-2xl bg-[#eff1f5] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#dfe9fb] px-2.5 py-1 text-[10px] font-bold text-[#1a4b84]"
                          disabled={!selected}
                        >
                          {tag}
                          <X size={12} />
                        </button>
                      ))}
                      <input
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="Thêm tag..."
                        className="h-8 min-w-[8rem] flex-1 rounded-lg border-none bg-transparent text-sm font-medium text-[#7f8798] outline-none placeholder:text-[#8a91a3]"
                        disabled={!selected}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold tracking-wide text-[#8a91a3]">Độ khó ước lượng</p>
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#f2f4f6]">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500" style={{ width: difficultyPercent }} />
                      </div>
                      <span className="text-base font-bold text-[#35507b]">{difficultyValue} / 10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={difficultyValue}
                      onChange={handleDifficultyChange}
                      disabled={!selected}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--brand-600)] disabled:cursor-not-allowed"
                      aria-label="Điều chỉnh độ khó"
                    />
                    <div className="flex items-center gap-2">
                      {[3, 5, 8].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleSelectDifficultyPreset(value)}
                          disabled={!selected}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                            difficultyValue === value
                              ? "bg-[#1a4b84] text-white"
                              : "bg-[#e5e7eb] text-[#334155] hover:bg-[#dbe2ea]"
                          } disabled:cursor-not-allowed disabled:opacity-55`}
                        >
                          {value}/10
                        </button>
                      ))}
                      <span className="ml-1 text-xs font-semibold text-[#5b6478]">{difficultyLabel}</span>
                    </div>
                    {difficultyNotice ? (
                      <p className="text-[11px] font-medium text-emerald-700">{difficultyNotice}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-5 right-4 flex flex-col gap-3">
            <Button
              variant="secondary"
              size="icon"
              className="h-14 w-14 rounded-full border-none bg-white text-red-600 shadow-2xl hover:bg-red-50"
              onClick={openRejectModal}
              title="Từ chối"
              disabled={!canRunActions}
            >
              {isActionRunning ? <Loader2 size={22} className="animate-spin" /> : <X size={24} />}
            </Button>
            <Button
              variant="success"
              size="icon"
              className="h-16 w-16 rounded-full border-none bg-gradient-to-br from-[#007f39] to-[#006e2f] text-white shadow-[0_12px_28px_rgba(0,110,47,0.3)]"
              title="Duyệt ngay"
              onClick={() => void handleApprove()}
              disabled={!canRunActions}
            >
              {isActionRunning ? <Loader2 size={28} className="animate-spin" /> : <CheckCircle2 size={30} />}
            </Button>
          </div>
        </section>
      </div>

      <div className="absolute bottom-3 left-5 text-xs text-slate-500">
        Trang {currentPage}/{totalPages} · {filteredQueue.length} tài liệu hiển thị
      </div>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Lý do từ chối">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Vui lòng chọn lý do để gửi thông báo cho người đăng.</p>

          <div className="space-y-2">
            {quickReasons.map((item) => {
              const active = quickReason === item.title;

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setQuickReason(item.title)}
                  className={`w-full rounded-xl border-2 p-3 text-left transition ${
                    active
                      ? "border-red-200 bg-red-50"
                      : "border-transparent bg-[#f2f4f6] hover:border-red-200 hover:bg-red-50"
                  }`}
                >
                  <p className="text-sm font-bold text-[var(--ink-900)]">{item.title}</p>
                  <p className="text-[11px] text-slate-500">{item.detail}</p>
                </button>
              );
            })}
          </div>

          <textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Lý do khác..."
            className="h-24 w-full rounded-xl border-none bg-[#f2f4f6] px-4 py-3 text-sm outline-none"
          />

          <div className="flex gap-2">
            <Button variant="secondary" fullWidth className="h-11 rounded-2xl" onClick={() => setRejectOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              fullWidth
              className="h-11 rounded-2xl"
              onClick={() => void confirmReject()}
              disabled={isActionRunning}
            >
              Xác nhận từ chối
            </Button>
          </div>
        </div>
      </Modal>

      {isRefreshing ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-white/50 backdrop-blur-[1px]">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-lg">
            <Loader2 size={14} className="animate-spin" /> Đang đồng bộ dữ liệu...
          </div>
        </div>
      ) : null}

    </div>
  );
}
