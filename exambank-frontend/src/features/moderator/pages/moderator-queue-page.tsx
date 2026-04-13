
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Save,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Input } from "@/components/ui/Input/input";
import { Modal } from "@/components/ui/Modal/modal";
import {
  ModeratorQueueItemCard,
  statusLabel,
} from "@/features/moderator/components/moderator-queue-item-card";
import {
  approveModeratorQueueItem,
  listModeratorQueueItems,
  rejectModeratorQueueItem,
  updateModeratorQueueMetadata,
  type ModeratorQueueRecord,
} from "@/features/moderator/services/moderator-queue.service";

const quickReasons = [
  {
    title: "Nội dung chưa rõ ràng",
    detail: "File mờ, mất chữ hoặc câu hỏi chưa đầy đủ.",
  },
  {
    title: "Sai phân loại",
    detail: "Môn học, học kỳ hoặc loại tài liệu chưa khớp.",
  },
  {
    title: "Cần cập nhật metadata",
    detail: "Cần chỉnh lại thông tin trước khi duyệt tài liệu.",
  },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function canModerate(status: string) {
  const normalized = normalizeText(status).toUpperCase();
  return normalized === "PENDING" || normalized === "PENDING_REVIEW";
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
  const [isMetadataSaving, setIsMetadataSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [quickReason, setQuickReason] = useState("");

  const [metadataTitle, setMetadataTitle] = useState("");
  const [metadataSchool, setMetadataSchool] = useState("");
  const [metadataSubject, setMetadataSubject] = useState("");
  const [metadataSemesterYear, setMetadataSemesterYear] = useState("");
  const [metadataCategory, setMetadataCategory] = useState("Đề thi học kỳ");
  const [metadataLecturer, setMetadataLecturer] = useState("");
  const [metadataModeratorNote, setMetadataModeratorNote] = useState("");


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
      setErrorMessage(extractApiErrorMessage(error, "Không thể tải danh sách tài liệu chờ duyệt."));

    
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

  const pendingCount = useMemo(
    () => filteredQueue.filter((item) => canModerate(item.status)).length,
    [filteredQueue]
  );

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
      setMetadataSchool("");
      setMetadataSubject("");
      setMetadataSemesterYear("");
      setMetadataCategory("Đề thi học kỳ");
      setMetadataLecturer("");
      setMetadataModeratorNote("");
      return;
    }

    setMetadataTitle(selected.title);
    setMetadataSchool(selected.school);
    setMetadataSubject(selected.subject);
    setMetadataSemesterYear(selected.semesterYear);
    setMetadataCategory(selected.category || "Đề thi học kỳ");
    setMetadataLecturer(selected.lecturer || "");
    setMetadataModeratorNote(selected.moderatorNote ?? "");
  }, [selected]);

  async function handleSaveMetadata() {
    if (!selected || isMetadataSaving || isActionRunning) {
      return;
    }

    if (!metadataTitle.trim()) {
      window.alert("Vui lòng nhập tiêu đề tài liệu.");
      return;
    }

    setIsMetadataSaving(true);

    try {
      await updateModeratorQueueMetadata(selected, {
        title: metadataTitle,
        school: metadataSchool,
        subject: metadataSubject,
        semesterYear: metadataSemesterYear,
        type: metadataCategory,
        lecturer: metadataLecturer,
      });

      await refreshQueue(true);
    } catch (error) {
      window.alert(extractApiErrorMessage(error, "Lưu metadata thất bại."));
    } finally {
      setIsMetadataSaving(false);
    }
  }

  function openRejectModal() {
    if (!selected || isActionRunning || !canModerate(selected.status)) {
      return;
    }

    setQuickReason("");
    setRejectReason("");
    setRejectOpen(true);
  }

  async function handleApprove() {
    if (!selected || isActionRunning || !canModerate(selected.status)) {
      return;
    }

    const shouldApprove = window.confirm(`Duyệt tài liệu "${selected.title}"?`);
    if (!shouldApprove) {
      return;
    }

    setIsActionRunning(true);

    try {
      await approveModeratorQueueItem(selected, metadataModeratorNote);
      await refreshQueue(true);
    } catch (error) {
      window.alert(extractApiErrorMessage(error, "Duyệt tài liệu thất bại."));
    } finally {
      setIsActionRunning(false);
    }
  }

  async function confirmReject() {
    if (!selected || isActionRunning || !canModerate(selected.status)) {
      return;
    }

    const finalReason = rejectReason.trim() || quickReason.trim();
    if (!finalReason) {
      window.alert("Vui lòng nhập lý do từ chối.");
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

  function downloadOriginalFile() {
    if (!selected?.fileUrl) {
      return;
    }

    window.open(selected.fileUrl, "_blank", "noopener,noreferrer");
  }

  const selectedStatus = selected?.status ?? "";
  const canRunActions = Boolean(selected) && !isActionRunning && !isRefreshing && canModerate(selectedStatus);

  return (
    <div className="relative min-h-[78vh] overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-gradient-to-br from-[#f7f9fb] via-[#f4f7fb] to-[#eef4ff] shadow-[0_16px_40px_rgba(16,21,38,0.08)]">
      <div className="flex min-h-[78vh] flex-col xl:flex-row">
        <section className="w-full border-r border-[#d9e2ef] bg-[linear-gradient(180deg,#f3f6fb_0%,#eef2f9_100%)] xl:w-[480px] 2xl:w-[520px]">
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#1a4b84]">Hàng chờ duyệt tài liệu</h2>
              <span className="rounded-full bg-[#1a4b84] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                {pendingCount} cần xử lý
              </span>
            </div>

            <Input
              placeholder="Tìm kiếm tài liệu..."
              value={globalKeyword}
              onChange={(event) => setGlobalKeyword(event.target.value)}
              startAdornment={<Search size={15} className="text-slate-400" />}
              inputWrapperClassName="rounded-full border border-[#d5dfec] bg-white shadow-sm"
              inputClassName="h-10 text-sm"
            />

            <div className="flex gap-2">
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="h-10 flex-1 rounded-lg border border-[#d5dfec] bg-white px-3 text-xs font-medium shadow-sm outline-none"
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
                className="h-10 flex-1 rounded-lg border border-[#d5dfec] bg-white px-3 text-xs font-medium shadow-sm outline-none"
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
              inputWrapperClassName="border border-[#d5dfec] bg-white shadow-sm"
            />

            <div className="flex items-center justify-between gap-2">
              {errorMessage ? <p className="text-xs font-semibold text-rose-600">{errorMessage}</p> : <span />}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void refreshQueue(true)}
                disabled={isRefreshing || isLoading}
                className="h-8 rounded-lg border border-[#d5dfec] bg-white"

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
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-500">
                Không có tài liệu nào theo bộ lọc hiện tại.
              </div>
            ) : (
              filteredQueue.map((item) => {
                const active = item.id === selected?.id;

                return (
                  <ModeratorQueueItemCard
                    key={item.id}
                    item={item}
                    active={active}
                    onSelect={setSelectedId}
                  />
                );
              })
            )}
          </div>
        </section>

        <section className="relative flex min-w-0 flex-1 flex-col bg-[#f8fafc]">
          <div className="h-[42%] min-h-[18rem] bg-[linear-gradient(180deg,#e8edf6_0%,#dde6f3_100%)] p-5 pb-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Eye size={16} className="shrink-0 text-[#1a4b84]" />
                <span className="truncate text-sm font-bold tracking-[0.08em] text-[#1a4b84]">Chi tiết tài liệu</span>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 rounded-lg border border-[#d5dfec] bg-white"
                  leftIcon={<Download size={13} />}
                  disabled={!selected?.fileUrl}
                  onClick={downloadOriginalFile}
                >
                  Tải file gốc
                </Button>
              </div>
            </div>

            <div className="mx-auto h-[calc(100%-2.5rem)] max-w-4xl overflow-hidden rounded-2xl border border-[#dae3ef] bg-white p-6 shadow-xl">
              <div className="h-full overflow-y-auto pr-2">
                <div className="space-y-3 text-center">
                  <h3 className="font-[var(--font-display)] text-xl font-black uppercase text-[#1e3556]">Xem nhanh tài liệu</h3>
                  <p className="font-[var(--font-display)] text-lg font-bold uppercase">{selected?.school ?? "--"}</p>
                  <p className="text-sm font-bold uppercase">{selected?.title ?? "Chưa có tài liệu"}</p>
                  <p className="text-sm italic text-slate-600">Môn học: {selected?.subject ?? "--"}</p>
                  <p className="text-sm italic text-slate-600">
                    Trạng thái: <span className="font-semibold">{selected ? statusLabel(selected.status) : "--"}</span>
                  </p>
                </div>

                <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
                  Nội dung preview sẽ hiển thị từ endpoint xem trước tài liệu khi backend cung cấp.
                </div>
              </div>
            </div>
          </div>

          <div className="h-[58%] overflow-y-auto rounded-t-3xl bg-white p-6 pb-28 shadow-[0_-12px_40px_rgba(0,0,0,0.03)] xl:pr-28">
            <div className="mx-auto max-w-5xl space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#d5e3ff] p-2.5 text-[#1a4b84]">
                    <Eye size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight text-[#202739]">Duyệt và chỉnh metadata</h3>
                    <p className="text-xs font-medium text-[#7d869c]">Cập nhật thông tin tài liệu trước khi duyệt hoặc từ chối</p>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={isMetadataSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  onClick={() => void handleSaveMetadata()}
                  disabled={!selected || isMetadataSaving || isRefreshing || isActionRunning}
                  className="border border-[#d5dfec] bg-white"
                >
                  Lưu metadata
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Tiêu đề"
                  value={metadataTitle}
                  onChange={(event) => setMetadataTitle(event.target.value)}
                  disabled={!selected}
                  inputClassName="h-11"
                />
                <Input
                  label="Trường"
                  value={metadataSchool}
                  onChange={(event) => setMetadataSchool(event.target.value)}
                  disabled={!selected}
                  inputClassName="h-11"
                />
                <Input
                  label="Môn học"
                  value={metadataSubject}
                  onChange={(event) => setMetadataSubject(event.target.value)}
                  disabled={!selected}
                  inputClassName="h-11"
                />
                <Input
                  label="Học kỳ / Năm"
                  value={metadataSemesterYear}
                  onChange={(event) => setMetadataSemesterYear(event.target.value)}
                  disabled={!selected}
                  inputClassName="h-11"
                />
                <Input
                  label="Loại tài liệu"
                  value={metadataCategory}
                  onChange={(event) => setMetadataCategory(event.target.value)}
                  disabled={!selected}
                  inputClassName="h-11"
                />
                <Input
                  label="Giảng viên"
                  value={metadataLecturer}
                  onChange={(event) => setMetadataLecturer(event.target.value)}
                  disabled={!selected}
                  inputClassName="h-11"
                />
              </div>

              <div>
                <p className="mb-2 text-[10px] font-extrabold tracking-wide text-[#8a91a3]">Ghi chú moderator (khi duyệt)</p>
                <textarea
                  value={metadataModeratorNote}
                  onChange={(event) => setMetadataModeratorNote(event.target.value)}
                  placeholder="Nhập ghi chú cho phiên duyệt..."
                  className="h-24 w-full rounded-xl border border-[var(--line-soft)] bg-[#f7f9fb] px-4 py-3 text-sm outline-none focus:border-[var(--brand-500)]"
                  disabled={!selected}
                />
              </div>

              <div className="rounded-xl border border-[#dce4ef] bg-[#f7f9fb] p-4 text-xs text-slate-500">
                Mã tài liệu: <span className="font-semibold text-slate-700">{selected?.documentId ?? "--"}</span>
                <span className="mx-2">•</span>
                Lượt tải: <span className="font-semibold text-slate-700">{selected?.downloadCount ?? 0}</span>
                <span className="mx-2">•</span>
                Định dạng: <span className="font-semibold text-slate-700">{selected?.fileType ?? "--"}</span>
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
        Trang {currentPage}/{totalPages} • {filteredQueue.length} tài liệu hiển thị
      </div>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Lý do từ chối">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Chọn nhanh lý do hoặc nhập lý do chi tiết.</p>

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
            placeholder="Nhập lý do từ chối..."
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
