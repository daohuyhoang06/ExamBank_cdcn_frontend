import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleAlert, Download, Eye, FileText, Filter, MessageSquare, Sparkles, Star, Trash2, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Pagination } from "@/components/ui/Pagination/pagination";
import { StatCard } from "@/components/ui/StatCard/stat-card";
import { alert as showAlert, confirm } from "@/lib/dialog";
import {
  approveAdminDocument,
  deleteAdminDocument,
  getAdminDocumentLogs,
  getAdminDocumentStats,
  getAdminDocuments,
  rejectAdminDocument,
  updateAdminDocumentMetadata,
  type AdminDocumentMetadataPayload,
  type AdminDocumentRecord,
  type AdminDocumentStats,
} from "@/features/admin/services/admin-documents.service";

type DocumentStat = {
  title: string;
  value: string;
  hint?: string;
  tone: "primary" | "danger" | "success" | "warning";
};

const pageSize = 10;
const METADATA_SUBJECT_OPTIONS = [
  "Toán học",
  "Văn học",
  "Tiếng Anh",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Lịch sử",
  "Địa lý",
  "Giáo dục công dân",
  "Tin học",
];
const METADATA_CATEGORY_OPTIONS = ["Thi thử", "Giữa kỳ", "Cuối kỳ"];
const METADATA_YEAR_OPTIONS = Array.from({ length: 7 }, (_, index) => String(2020 + index));
const METADATA_CLASS_OPTIONS = Array.from({ length: 12 }, (_, index) => `Lớp ${index + 1}`);

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(parsed);
}

function formatDateKey(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

function buildPreviewEmbedUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  const isPdf = lower.includes(".pdf");
  if (!isPdf || trimmed.includes("#")) {
    return trimmed;
  }

  return `${trimmed}#toolbar=0&navpanes=0&view=FitH&zoom=45`;
}

function isImagePreviewUrl(url: string) {
  const normalized = url.trim().toLowerCase();
  return /\.(png|jpe?g|webp|gif|bmp|svg)(?:\?|#|$)/.test(normalized);
}

function isPlaceholderCategory(value: string | null | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return /(\bfinal\b|\bmock\b|\bdraft\b|\btest\b|\bsample\b|\bdemo\b|\btemp\b|\btemporary\b)/i.test(normalized);
}

function formatDocumentCategory(document: AdminDocumentRecord) {
  const candidates = [document.subject, document.type, document.className, document.school];
  const category = candidates.find((value) => !isPlaceholderCategory(value));

  return category ?? "Chưa phân loại";
}

function getDocumentStatusGroup(status: string | null | undefined) {
  const value = (status ?? "").toUpperCase();

  if (value === "APPROVED" || value === "TRANSFORMED") {
    return "approved" as const;
  }

  if (value === "REJECTED") {
    return "rejected" as const;
  }

  if (value === "PENDING" || value === "PENDING_REVIEW") {
    return "pending" as const;
  }

  return "other" as const;
}

function normalizeStatus(status: string | null | undefined) {
  const value = (status ?? "").toUpperCase();

  if (value === "APPROVED" || value === "TRANSFORMED") {
    return { label: value, tone: "success" as const };
  }

  if (value === "REJECTED") {
    return { label: value, tone: "danger" as const };
  }

  if (value === "PENDING" || value === "PENDING_REVIEW") {
    return { label: value, tone: "warning" as const };
  }

  return { label: value || "UNKNOWN", tone: "primary" as const };
}

function statToneClasses(tone: DocumentStat["tone"]) {
  if (tone === "danger") {
    return {
      wrap: "bg-rose-50 border-rose-100",
      value: "text-rose-700",
      badge: "bg-rose-100 text-rose-700",
      icon: "bg-rose-100 text-rose-700",
    };
  }

  if (tone === "success") {
    return {
      wrap: "bg-emerald-50 border-emerald-100",
      value: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700",
      icon: "bg-emerald-100 text-emerald-700",
    };
  }

  if (tone === "warning") {
    return {
      wrap: "bg-amber-50 border-amber-100",
      value: "text-amber-800",
      badge: "bg-amber-100 text-amber-800",
      icon: "bg-amber-100 text-amber-800",
    };
  }

  return {
    wrap: "bg-white border-[var(--line-soft)]",
    value: "text-[var(--brand-700)]",
    badge: "bg-[var(--accent-100)] text-[var(--accent-500)]",
    icon: "bg-[var(--brand-100)] text-[var(--brand-700)]",
  };
}

function buildStats(stats: AdminDocumentStats | null): DocumentStat[] {
  return [
    {
      title: "Tổng tài liệu",
      value: formatNumber(stats?.totalDocuments ?? 0),
      hint: "All statuses",
      tone: "primary",
    },
    {
      title: "APPROVED",
      value: formatNumber(stats?.approvedDocuments ?? 0),
      hint: "Ready",
      tone: "success",
    },
    {
      title: "PENDING_REVIEW",
      value: formatNumber(stats?.pendingDocuments ?? 0),
      hint: "In review",
      tone: "warning",
    },
    {
      title: "REJECTED",
      value: formatNumber(stats?.rejectedDocuments ?? 0),
      hint: "Removed",
      tone: "danger",
    },
  ];
}

export default function AdminContentPage() {
  const [documents, setDocuments] = useState<AdminDocumentRecord[]>([]);
  const [approvalLogs, setApprovalLogs] = useState<AdminDocumentRecord[]>([]);
  const [stats, setStats] = useState<AdminDocumentStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedByFilter, setUploadedByFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [batchAction, setBatchAction] = useState<"approve" | "reject" | null>(null);
  const [selectedDocumentDetail, setSelectedDocumentDetail] = useState<AdminDocumentRecord | null>(null);
  const [detailMetadata, setDetailMetadata] = useState<AdminDocumentMetadataPayload>({
    title: "",
    school: "",
    subject: "",
    semester: "",
    type: "",
    className: "",
  });
  const [detailRejectNote, setDetailRejectNote] = useState("");
  const [detailAction, setDetailAction] = useState<"approve" | "reject" | "override" | "delete" | "metadata" | null>(null);
  const [showCommentsInDetail, setShowCommentsInDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [documentList, documentStats, documentLogs] = await Promise.all([
        getAdminDocuments(),
        getAdminDocumentStats(),
        getAdminDocumentLogs(),
      ]);

      setDocuments(documentList);
      setStats(documentStats);
      setApprovalLogs(documentLogs);
      setCurrentPage(1);
      setSelectedDocumentIds([]);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Không tải được dữ liệu tài liệu.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (selectedDocumentDetail) {
      document.body.classList.add("admin-detail-modal-open");
    } else {
      document.body.classList.remove("admin-detail-modal-open");
    }

    return () => {
      document.body.classList.remove("admin-detail-modal-open");
    };
  }, [selectedDocumentDetail]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedDocumentIds([]);
  }, [statusFilter, categoryFilter, uploadedByFilter, dateFilter, searchQuery]);

  async function handleDeleteDocument(document: AdminDocumentRecord) {
    const confirmed = await confirm(`Bạn có chắc muốn gỡ tài liệu "${document.title}"?`, {
      title: "Gỡ tài liệu",
      type: "danger",
      confirmText: "Gỡ",
      cancelText: "Hủy",
    });

    if (!confirmed) {
      return;
    }

    setDeletingDocumentId(document.id);

    try {
      await deleteAdminDocument(document.id);
      await loadData();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Không thể gỡ tài liệu.";
      await showAlert(message);
    } finally {
      setDeletingDocumentId(null);
    }
  }

  function openPreview(document: AdminDocumentRecord) {
    setSelectedDocumentDetail(document);
    setDetailMetadata({
      title: document.title ?? "",
      school: document.school ?? "",
      subject: document.subject ?? "",
      semester: document.semester ?? "",
      type: document.type ?? "",
      className: document.className ?? "",
    });
    setDetailRejectNote(document.moderatorNote ?? "");
    setShowCommentsInDetail(false);
  }

  function closeDetailModal() {
    if (detailAction) {
      return;
    }
    setSelectedDocumentDetail(null);
    setDetailRejectNote("");
    setShowCommentsInDetail(false);
  }

  async function handleApproveInDetail() {
    if (!selectedDocumentDetail || detailAction) {
      return;
    }

    setDetailAction("approve");
    try {
      if (selectedDocumentDetail.moderatorNote) {
        await updateAdminDocumentMetadata(selectedDocumentDetail.id, {
          ...detailMetadata,
          moderatorNote: null,
        });
      }
      await approveAdminDocument(selectedDocumentDetail.id);
      await loadData();
      setSelectedDocumentDetail(null);
      setDetailRejectNote("");
      await showAlert("Đã duyệt tài liệu thành công.");
    } catch (error) {
      await showAlert(error instanceof Error ? error.message : "Duyệt tài liệu thất bại.");
    } finally {
      setDetailAction(null);
    }
  }

  async function handleSaveMetadataInDetail() {
    if (!selectedDocumentDetail || detailAction) {
      return;
    }

    setDetailAction("metadata");
    try {
      await updateAdminDocumentMetadata(selectedDocumentDetail.id, detailMetadata);
      await loadData();
      setSelectedDocumentDetail((current) => (
        current
          ? {
              ...current,
              ...detailMetadata,
              title: detailMetadata.title.trim(),
            }
          : null
      ));
      await showAlert("Đã cập nhật metadata.");
    } catch (error) {
      await showAlert(error instanceof Error ? error.message : "Cập nhật metadata thất bại.");
    } finally {
      setDetailAction(null);
    }
  }

  async function handleRejectInDetail() {
    if (!selectedDocumentDetail || detailAction) {
      return;
    }

    const note = detailRejectNote.trim();
    if (!note) {
      await showAlert("Vui lòng nhập lý do từ chối.");
      return;
    }

    setDetailAction("reject");
    try {
      await rejectAdminDocument(selectedDocumentDetail.id, note);
      await loadData();
      setSelectedDocumentDetail(null);
      setDetailRejectNote("");
      await showAlert("Đã từ chối tài liệu thành công.");
    } catch (error) {
      await showAlert(error instanceof Error ? error.message : "Từ chối tài liệu thất bại.");
    } finally {
      setDetailAction(null);
    }
  }

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();

    documents.forEach((document) => {
      const category = formatDocumentCategory(document);
      if (category !== "Chưa phân loại") {
        categories.add(category);
      }
    });

    return Array.from(categories).sort((left, right) => left.localeCompare(right, "vi"));
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const normalizedKeyword = uploadedByFilter.trim().toLowerCase();
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return documents.filter((document) => {
      if (
        normalizedSearchQuery.length > 0 &&
        !(document.title ?? "").toLowerCase().includes(normalizedSearchQuery)
      ) {
        return false;
      }

      if (statusFilter !== "all" && getDocumentStatusGroup(document.status) !== statusFilter) {
        return false;
      }

      if (categoryFilter !== "all" && formatDocumentCategory(document) !== categoryFilter) {
        return false;
      }

      if (normalizedKeyword) {
        const haystack = [document.uploadedByName, document.title, document.school, document.subject]
          .filter((value): value is string => Boolean(value))
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedKeyword)) {
          return false;
        }
      }

      if (dateFilter && formatDateKey(document.submittedAt) !== dateFilter) {
        return false;
      }

      return true;
    });
  }, [categoryFilter, dateFilter, documents, searchQuery, statusFilter, uploadedByFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredDocuments.length]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const pagedDocuments = filteredDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleLogs = approvalLogs.slice(0, 5);
  const detailHistory = selectedDocumentDetail
    ? approvalLogs.filter((item) => item.id === selectedDocumentDetail.id).slice(0, 6)
    : [];
  const pagedDocumentIds = pagedDocuments.map((document) => document.id);
  const selectedFilteredDocuments = filteredDocuments.filter((document) => selectedDocumentIds.includes(document.id));
  const allPagedSelected = pagedDocumentIds.length > 0 && pagedDocumentIds.every((id) => selectedDocumentIds.includes(id));

  function toggleSelectedDocument(documentId: number) {
    setSelectedDocumentIds((current) => (
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    ));
  }

  function toggleAllPagedDocuments() {
    setSelectedDocumentIds((current) => {
      if (allPagedSelected) {
        return current.filter((id) => !pagedDocumentIds.includes(id));
      }

      return Array.from(new Set([...current, ...pagedDocumentIds]));
    });
  }

  async function runBulkModeration(action: "approve" | "reject") {
    if (selectedFilteredDocuments.length === 0 || batchAction) {
      return;
    }

    const title = action === "approve" ? "Duyệt hàng loạt" : "Từ chối hàng loạt";
    const confirmText = action === "approve" ? "Duyệt" : "Từ chối";
    const prompt =
      action === "approve"
        ? `Bạn có chắc muốn duyệt ${selectedFilteredDocuments.length} tài liệu đã chọn không?`
        : `Bạn có chắc muốn từ chối ${selectedFilteredDocuments.length} tài liệu đã chọn không?`;

    const confirmed = await confirm(prompt, {
      title,
      type: action === "approve" ? "success" : "danger",
      confirmText,
      cancelText: "Hủy",
    });

    if (!confirmed) {
      return;
    }

    setBatchAction(action);

    try {
      const results = await Promise.allSettled(
        selectedFilteredDocuments.map((document) =>
          action === "approve"
            ? approveAdminDocument(document.id)
            : rejectAdminDocument(document.id)
        )
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;
      const successCount = results.length - failedCount;

      await loadData();
      setSelectedDocumentIds([]);

      if (failedCount > 0) {
        await showAlert(`Đã xử lý ${successCount}/${results.length} tài liệu. ${failedCount} tài liệu thất bại.`);
      } else {
        await showAlert(
          action === "approve"
            ? `Đã duyệt ${successCount} tài liệu.`
            : `Đã từ chối ${successCount} tài liệu.`
        );
      }
    } catch (error) {
      const fallback = action === "approve" ? "Duyệt hàng loạt thất bại." : "Từ chối hàng loạt thất bại.";
      await showAlert(error instanceof Error ? error.message : fallback);
    } finally {
      setBatchAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-[var(--font-label)] text-3xl font-extrabold tracking-tight text-[var(--ink-900)]">
            Quản lý tài liệu
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-600)]">
            Xem toàn bộ tài liệu, theo dõi trạng thái đã duyệt / chưa duyệt, gỡ tài liệu sai phạm,
            và kiểm tra nhật ký duyệt của moderator.
          </p>
        </div>

      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {buildStats(stats).map((item) => {
          const tone = statToneClasses(item.tone);
          const icon = item.tone === "danger"
            ? <CircleAlert size={18} />
            : item.tone === "success"
              ? <Eye size={18} />
              : item.tone === "warning"
                ? <TrendingUp size={18} />
                : <FileText size={18} />;

          return (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              icon={icon}
              badge={item.hint}
              cardClassName={`border shadow-[var(--shadow-soft)] ${tone.wrap}`}
              iconWrapClassName={tone.icon}
              badgeClassName={tone.badge}
              valueClassName={tone.value}
            />
          );
        })}
      </section>


      <section className="overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 border-b border-[var(--line-soft)] bg-[var(--bg-soft)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-5">
              <h2 className="font-[var(--font-label)] text-base font-bold text-[var(--ink-900)]">
                Danh sách tài liệu
              </h2>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink-600)]">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {formatNumber(filteredDocuments.length)} tài liệu
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void runBulkModeration("approve")}
              disabled={selectedFilteredDocuments.length === 0 || batchAction !== null}
              className="rounded-full px-5 text-sm font-semibold"
            >
              {batchAction === "approve" ? "Đang duyệt..." : "Duyệt hàng loạt"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => void runBulkModeration("reject")}
              disabled={selectedFilteredDocuments.length === 0 || batchAction !== null}
              className="rounded-full border border-[#cfdbe2] bg-white px-5 text-sm font-semibold text-[#1a4b84] shadow-sm hover:bg-[#eef4ff]"
            >
              {batchAction === "reject" ? "Đang từ chối..." : "Từ chối hàng loạt"}
            </Button>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm kiếm tên đề..."
              className="min-w-[240px] rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition placeholder:text-[var(--ink-400)] focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            >
              <option value="all">Tất cả danh mục</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            />
            <input
              type="text"
              value={uploadedByFilter}
              onChange={(event) => setUploadedByFilter(event.target.value)}
              placeholder="Tìm tên user..."
              className="min-w-[200px] rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition placeholder:text-[var(--ink-400)] focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">PENDING_REVIEW</option>
              <option value="approved">APPROVED</option>
              <option value="rejected">REJECTED</option>
            </select>
            <Button
              type="button"
              variant="icon"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={() => {
                setCategoryFilter("all");
                setDateFilter("");
                setUploadedByFilter("");
                setStatusFilter("all");
                setSearchQuery("");
              }}
            >
              <Filter size={16} />
            </Button>

        </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full w-full table-fixed text-left">
            <thead>
              <tr className="bg-[var(--bg-soft)] text-[0.68rem] uppercase tracking-[0.12em] text-[var(--ink-600)]">
                <th className="w-[48px] px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allPagedSelected}
                    onChange={toggleAllPagedDocuments}
                    className="h-4 w-4 rounded border-[var(--line-soft)] text-[var(--brand-700)] focus:ring-[var(--brand-300)]"
                    aria-label="Chọn tất cả tài liệu ở trang này"
                  />
                </th>
                <th className="w-[260px] px-3 py-3 font-bold">Tiêu đề tài liệu</th>
                <th className="w-[120px] px-3 py-3 font-bold">Danh mục</th>
                <th className="w-[140px] px-3 py-3 font-bold">Người đăng</th>
                <th className="w-[140px] px-3 py-3 font-bold">Ngày đăng</th>
                <th className="w-[120px] px-3 py-3 font-bold">Trạng thái</th>
                <th className="w-[150px] px-3 py-3 font-bold">Người kiểm duyệt</th>
                <th className="w-[120px] px-3 py-3 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-t border-[var(--line-soft)]/70">
                  <td className="px-3 py-8 text-sm text-[var(--ink-600)]" colSpan={8}>
                    Đang tải dữ liệu tài liệu...
                  </td>
                </tr>
              ) : pagedDocuments.length > 0 ? (
                pagedDocuments.map((document) => {
                  const status = normalizeStatus(document.status);
                  const isSelected = selectedDocumentIds.includes(document.id);

                  return (
                    <tr
                      key={document.id}
                      className="border-t border-[var(--line-soft)]/70 transition hover:bg-[var(--bg-soft)]/60"
                    >
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectedDocument(document.id)}
                          className="h-4 w-4 rounded border-[var(--line-soft)] text-[var(--brand-700)] focus:ring-[var(--brand-300)]"
                          aria-label={`Chọn tài liệu ${document.title}`}
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => openPreview(document)}
                          className="text-left"
                        >
                          <p className="break-words text-sm font-semibold text-[var(--ink-900)] hover:text-[var(--brand-700)] hover:underline">
                            {document.title}
                          </p>
                          <p className="mt-1 break-words text-xs text-[var(--ink-600)]">
                            {document.className ?? document.school ?? "Tài liệu"}
                          </p>
                        </button>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <p className="break-words text-sm font-semibold text-[var(--ink-900)]">
                          {formatDocumentCategory(document)}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top text-sm text-[var(--ink-700)]">
                        {document.uploadedByName ?? "Người dùng"}
                      </td>
                      <td className="px-3 py-3 align-top text-sm text-[var(--ink-600)] whitespace-nowrap">
                        {formatDateTime(document.submittedAt)}
                      </td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] ${
                            status.tone === "danger"
                              ? "bg-rose-100 text-rose-700"
                              : status.tone === "success"
                                ? "bg-emerald-100 text-emerald-700"
                                : status.tone === "warning"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top text-sm text-[var(--ink-700)] break-words">
                        {document.approvedByName ?? "--"}
                      </td>
                      <td className="px-3 py-3 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md text-[var(--ink-500)] transition hover:bg-[var(--bg-soft)] hover:text-[var(--brand-700)]"
                            title="Xem chi tiết"
                            onClick={() => openPreview(document)}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md text-red-600 transition hover:bg-red-100 hover:text-red-700"
                            title="Gỡ tài liệu"
                            disabled={deletingDocumentId === document.id}
                            onClick={() => void handleDeleteDocument(document)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="border-t border-[var(--line-soft)]/70">
                  <td className="px-3 py-8 text-sm text-[var(--ink-600)]" colSpan={8}>
                    Chưa có tài liệu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--line-soft)] bg-[var(--bg-soft)] p-5 sm:flex-row">
          <p className="text-sm text-[var(--ink-600)]">
            Hiển thị {formatNumber(Math.min(filteredDocuments.length, (currentPage - 1) * pageSize + 1))} - {formatNumber(Math.min(filteredDocuments.length, currentPage * pageSize))} trong tổng số {formatNumber(filteredDocuments.length)} tài liệu
          </p>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </section>

      <section id="admin-document-logs" className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,var(--brand-700)_0%,var(--brand-600)_100%)] p-8 text-white shadow-[var(--shadow-brand)] xl:col-span-2">
          <div className="relative z-10">
            <h3 className="font-[var(--font-label)] text-xl font-bold">Nhật ký phê duyệt gần đây</h3>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/90">
              Đây là log “ai duyệt cái gì” lấy trực tiếp từ tài liệu đã duyệt, kèm người duyệt và thời điểm cập nhật gần nhất.
            </p>

            <div className="mt-6 space-y-3">
              {visibleLogs.length > 0 ? (
                visibleLogs.map((item) => (
                  <button
                    key={`log-${item.id}`}
                    type="button"
                    onClick={() => openPreview(item)}
                    className="flex w-full items-start justify-between gap-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left transition hover:bg-white/15"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-white/80">
                        {item.approvedByName ?? "Chưa xác định"} đã duyệt tài liệu này
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-white/80">{formatDateTime(item.updatedAt ?? item.submittedAt)}</span>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80">
                  Chưa có log phê duyệt.
                </div>
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-14 right-10 h-52 w-52 rounded-full bg-blue-300/20 blur-3xl" />
        </article>

        <article className="rounded-3xl border border-white/40 bg-[var(--bg-soft)]/70 p-8 backdrop-blur-sm shadow-[var(--shadow-soft)]">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-100)] text-[var(--brand-700)]">
            <Sparkles size={20} />
          </span>
          <h3 className="mt-4 font-[var(--font-label)] text-lg font-bold text-[var(--ink-900)]">Nhắc việc vận hành</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-600)]">
            Admin chỉ xem thống kê, tra cứu và gỡ tài liệu vi phạm. Luồng duyệt nội dung vẫn thuộc moderator.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight size={16} />}
            className="mt-4 h-auto px-0 text-sm font-semibold text-[var(--brand-700)] hover:underline"
            onClick={() => document.getElementById("admin-document-logs")?.scrollIntoView({ behavior: "smooth" })}
          >
            Xem nhật ký
          </Button>
        </article>
      </section>

      {selectedDocumentDetail ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeDetailModal} />
          <section className="relative flex h-[88vh] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl border border-[#d6d9df] bg-white shadow-[0_28px_64px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between bg-[linear-gradient(90deg,#eef5ff_0%,#fff6ea_55%,#eef7ff_100%)] px-3 py-1.5">
              <h3 className="text-[1.1rem] font-bold tracking-tight text-[#111827]">Chi tiết tài liệu</h3>
              <button
                type="button"
                onClick={closeDetailModal}
                disabled={Boolean(detailAction)}
                className="rounded-lg p-1.5 text-[#6b7280] hover:bg-white/70 disabled:cursor-not-allowed"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[1.7fr_1fr]">
              <div className="flex h-full flex-col gap-3">
                <div className="flex min-h-[240px] flex-1 flex-col rounded-xl border border-[#cfd5df] bg-[#eef1f6] p-4">
                  <p className="mb-3 text-lg font-bold text-[#111827]">Document Preview</p>
                  {selectedDocumentDetail.previewUrl ? (
                    isImagePreviewUrl(selectedDocumentDetail.previewUrl) ? (
                      <div className="flex h-full items-center justify-center rounded-lg border border-[#d6d9e0] bg-white p-2">
                        <img
                          alt={`preview-${selectedDocumentDetail.id}`}
                          src={selectedDocumentDetail.previewUrl}
                          className="max-h-full w-auto max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <iframe
                        title={`preview-${selectedDocumentDetail.id}`}
                        src={buildPreviewEmbedUrl(selectedDocumentDetail.previewUrl)}
                        className="h-full w-full rounded-lg border border-[#d6d9e0] bg-white"
                      />
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#c9cfda] bg-white text-sm text-[#6b7280]">
                      Tài liệu này chưa có đường dẫn xem trước.
                    </div>
                  )}
                </div>

                <div className="mt-auto rounded-xl border border-[#d8dce3] bg-white p-3">
                  <p className="text-[1rem] font-bold text-[#111827]">Cập nhật Metadata</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[#1f2937]">Tiêu đề</span>
                      <input value={detailMetadata.title} onChange={(event) => setDetailMetadata((v) => ({ ...v, title: event.target.value }))} className="h-8 rounded-md border border-[#d1d5db] px-2.5 text-xs" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[#1f2937]">Trường</span>
                      <input value={detailMetadata.school ?? ""} onChange={(event) => setDetailMetadata((v) => ({ ...v, school: event.target.value }))} placeholder="*editable input" className="h-8 rounded-md border border-[#d1d5db] px-2.5 text-xs" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[#1f2937]">Môn học</span>
                      <select value={detailMetadata.subject ?? ""} onChange={(event) => setDetailMetadata((v) => ({ ...v, subject: event.target.value }))} className="h-8 rounded-md border border-[#d1d5db] px-2.5 text-xs">
                        <option value="">Chọn môn học</option>
                        {METADATA_SUBJECT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[#1f2937]">Năm học</span>
                      <select value={detailMetadata.semester ?? ""} onChange={(event) => setDetailMetadata((v) => ({ ...v, semester: event.target.value }))} className="h-8 rounded-md border border-[#d1d5db] px-2.5 text-xs">
                        <option value="">Chọn năm học</option>
                        {METADATA_YEAR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[#1f2937]">Loại tài liệu</span>
                      <select value={detailMetadata.type ?? ""} onChange={(event) => setDetailMetadata((v) => ({ ...v, type: event.target.value }))} className="h-8 rounded-md border border-[#d1d5db] px-2.5 text-xs">
                        <option value="">Chọn loại tài liệu</option>
                        {METADATA_CATEGORY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[#1f2937]">Lớp học</span>
                      <select value={detailMetadata.className ?? ""} onChange={(event) => setDetailMetadata((v) => ({ ...v, className: event.target.value }))} className="h-8 rounded-md border border-[#d1d5db] px-2.5 text-xs">
                        <option value="">Chọn lớp học</option>
                        {METADATA_CLASS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                  </div>
                  <Button type="button" variant="primary" className="mt-2 h-8 w-full rounded-md bg-[#114a8d] text-xs text-white hover:bg-[#0f3f78]" onClick={() => void handleSaveMetadataInDetail()} disabled={Boolean(detailAction)}>
                    {detailAction === "metadata" ? "Đang lưu..." : "Lưu Metadata"}
                  </Button>
                  <p
                    className="mt-1.5 origin-left text-xs font-normal text-[#4b5563] scale-[0.45]"
                    style={{ fontSize: "20px", lineHeight: "1" }}
                  >
                    Mã tài liệu: {selectedDocumentDetail.id} • Định dạng: PDF
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-[#d6dfec] bg-[linear-gradient(135deg,#213248_0%,#1e2c3f_100%)] p-3 text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)]">
                  <p className="text-[1.05rem] font-bold text-[#7db2ff]">Community Stats</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <p className="text-[2rem] font-black leading-none">{(selectedDocumentDetail.averageRating?.toFixed(1) ?? "0.0")}</p>
                    <p className="text-[1.25rem] font-bold leading-none text-white/85">/ 5</p>
                    <div className="ml-1 flex items-center gap-0.5">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <Star
                          key={index}
                          size={16}
                          className={
                            index < Math.round(selectedDocumentDetail.averageRating ?? 0)
                              ? "fill-[#f4b400] text-[#f4b400]"
                              : "fill-white/25 text-white/25"
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <div className="rounded-lg border border-white/20 bg-white/92 p-1.5 text-[#1f2937]">
                      <p className="flex items-center gap-1 text-[9px] font-medium leading-none text-[#64748b]"><Download size={10} />Lượt tải</p>
                      <p className="mt-1 text-[1.05rem] font-black leading-none">{formatNumber(selectedDocumentDetail.downloadCount ?? 0)}</p>
                    </div>
                    <div className="rounded-lg border border-white/20 bg-white/92 p-1.5 text-[#1f2937]">
                      <p className="flex items-center gap-1 text-[9px] font-medium leading-none text-[#64748b]"><Eye size={10} />Lượt xem</p>
                      <p className="mt-1 text-[1.05rem] font-black leading-none">{formatNumber(selectedDocumentDetail.viewCount ?? selectedDocumentDetail.downloadCount ?? 0)}</p>
                    </div>
                    <div className="rounded-lg border border-white/20 bg-white/92 p-1.5 text-[#1f2937]">
                      <p className="flex items-center gap-1 text-[9px] font-medium leading-none text-[#64748b]"><MessageSquare size={10} />Bình luận</p>
                      <p className="mt-1 text-[1.05rem] font-black leading-none">{formatNumber(selectedDocumentDetail.commentCount ?? 0)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCommentsInDetail(true)}
                    className="mt-2 text-[12px] font-semibold text-[#63a3ff] hover:text-[#8bb8ff] hover:underline"
                  >
                    Xem {formatNumber(selectedDocumentDetail.commentCount ?? 0)} bình luận
                  </button>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-[#d6dfec] bg-[linear-gradient(135deg,#25374d_0%,#1f2f43_100%)] p-4 text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)]">
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <p className="text-[1.1rem] font-extrabold">Lịch sử duyệt</p>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8caed4_0%,#5f7ea7_100%)] text-xl font-bold text-white/95">
                        {(selectedDocumentDetail.approvedByName ?? "M").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="text-sm">
                        <p className="leading-tight font-bold text-white">{selectedDocumentDetail.approvedByName ?? "Chưa xác định"}</p>
                        <p className="mt-1 leading-tight text-white/75">{formatDateTime(selectedDocumentDetail.updatedAt ?? selectedDocumentDetail.submittedAt)}</p>
                      </div>
                    </div>
                    <div className="mt-3 border-l border-white/20 pl-3">
                      <p className="text-sm leading-tight text-white/85">
                        Hành động:{" "}
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-extrabold ${
                          normalizeStatus(selectedDocumentDetail.status).tone === "danger"
                            ? "bg-rose-500/20 text-rose-300"
                            : normalizeStatus(selectedDocumentDetail.status).tone === "warning"
                              ? "bg-amber-500/20 text-amber-200"
                              : "bg-emerald-500/20 text-emerald-200"
                        }`}>
                          {normalizeStatus(selectedDocumentDetail.status).label}
                        </span>
                      </p>
                      <p className="mt-2 text-sm leading-tight text-white/85">Lý do: {selectedDocumentDetail.moderatorNote ?? "Chưa có"}</p>
                    </div>
                  </div>
                  {showCommentsInDetail && (
                    <div className="mt-3 space-y-2">
                      {detailHistory.length > 0 ? detailHistory.map((item, index) => (
                        <div key={`${item.id}-${index}-${item.updatedAt ?? "unknown"}`} className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white/85">
                          <p className="font-semibold">{item.approvedByName ?? "Chưa xác định"} · {normalizeStatus(item.status).label}</p>
                          <p className="text-white/65">{formatDateTime(item.updatedAt ?? item.submittedAt)}</p>
                        </div>
                      )) : <p className="text-xs text-white/70">Chưa có lịch sử duyệt.</p>}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[#cdd5df] bg-[#eef2f7] p-4">
                  <textarea
                    value={detailRejectNote}
                    onChange={(event) => setDetailRejectNote(event.target.value)}
                    placeholder="Ghi chú admin..."
                    className="mt-2 min-h-[100px] w-full rounded-xl border border-[#8fb3da] bg-white px-3 py-2 text-sm outline-none focus:border-[#5f93d3]"
                  />
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <Button type="button" variant="primary" onClick={() => void handleApproveInDetail()} disabled={Boolean(detailAction)}>{detailAction === "approve" ? "Đang duyệt..." : "Duyệt đề"}</Button>
                    <Button type="button" variant="danger" onClick={() => void handleRejectInDetail()} disabled={Boolean(detailAction)}>{detailAction === "reject" ? "Đang từ chối..." : "Từ chối đề"}</Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
