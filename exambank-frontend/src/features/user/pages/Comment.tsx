
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Star,
  ChevronRight,
  Users,
  BarChart2,
  Image as ImageIcon,
  MoreHorizontal,
  ThumbsUp,
  Reply,
  Verified,
  Award
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination/pagination';
import type { Comment } from '../types/user.type';
import { userService } from '../services/user.service';
import { getStoredAuthUser } from '@/features/auth/services/auth.service';

const COMMENTS_PER_PAGE = 5;

const PREVIEW_MIME_EXTENSION_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

const resolveExtensionFromMimeType = (mimeType: string): string => {
  return PREVIEW_MIME_EXTENSION_MAP[mimeType] ?? 'pdf';
};

const sanitizeDownloadFileSegment = (value?: string): string => {
  const safeValue = (value ?? '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return safeValue;
};

const normalizeDownloadFileName = (
  title: string,
  subject: string | undefined,
  semesterYear: string | undefined,
  extension: string,
): string => {
  const segments = [
    sanitizeDownloadFileSegment(title) || 'de-thi',
    sanitizeDownloadFileSegment(subject) || 'da-mon',
    sanitizeDownloadFileSegment(semesterYear) || 'khong-ro-nam',
  ];

  return `${segments.join('-')}.${extension}`;
};

const resolveDocumentPreviewUrl = (documentId?: number): string | null => {
  if (!documentId || Number.isNaN(documentId) || documentId <= 0) {
    return null;
  }

  const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').trim();

  if (configuredBaseUrl.length > 0) {
    try {
      const base = new URL(configuredBaseUrl, window.location.origin);
      return new URL(`/api/v1/documents/${documentId}/preview`, `${base.protocol}//${base.host}`).toString();
    } catch {
      // Fallback to current origin when base URL is invalid.
    }
  }

  return new URL(`/api/v1/documents/${documentId}/preview`, window.location.origin).toString();
};

// --- Main Page Component ---
export default function DiscussionDetailPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedDocuments, setRelatedDocuments] = useState<Array<{ id: number; title: string; subject?: string; averageRating?: number; semesterYear?: string }>>([]);
  const [documentTitle, setDocumentTitle] = useState('Chi tiết thảo luận');
  const [documentSubject, setDocumentSubject] = useState<string | undefined>(undefined);
  const [documentSemesterYear, setDocumentSemesterYear] = useState<string | undefined>(undefined);
  const [documentFileUrl, setDocumentFileUrl] = useState<string | null>(null);
  const [inlinePreviewUrl, setInlinePreviewUrl] = useState<string | null>(null);
  const [ratingAverage, setRatingAverage] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [commentPage, setCommentPage] = useState(1);
  const [currentUserReviewId, setCurrentUserReviewId] = useState<number | null>(null);

  const getCurrentUserId = useCallback((): number | null => {
    const storedUser = getStoredAuthUser();
    const rawId = storedUser?.id;
    if (rawId === undefined || rawId === null || String(rawId).trim().length === 0) {
      return null;
    }
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const applyUserReviewSnapshot = useCallback((commentList: Comment[]) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      setCurrentUserReviewId(null);
      return;
    }

    const existing = commentList.find((item) => item.userId === currentUserId);
    setCurrentUserReviewId(existing?.id ?? null);
    if (existing) {
      setReviewRating(existing.rating ?? 0);
      setReviewText(existing.content ?? '');
    } else {
      setReviewRating(0);
      setReviewText('');
    }
  }, [getCurrentUserId]);

  useEffect(() => {
    return () => {
      if (inlinePreviewUrl && inlinePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(inlinePreviewUrl);
      }
    };
  }, [inlinePreviewUrl]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let resolvedDocumentId = documentId ? Number(documentId) : null;

        if (!resolvedDocumentId || Number.isNaN(resolvedDocumentId)) {
          const documents = await userService.getDocuments({ status: 'APPROVED', size: 1 });
          if (documents.length > 0) {
            resolvedDocumentId = documents[0].id;
            navigate(`/user/comment/${resolvedDocumentId}`, { replace: true });
          }
        }

        if (!resolvedDocumentId) {
          setComments([]);
          setDocumentSubject(undefined);
          setDocumentSemesterYear(undefined);
          setDocumentFileUrl(null);
          setInlinePreviewUrl((current) => {
            if (current && current.startsWith('blob:')) {
              URL.revokeObjectURL(current);
            }
            return null;
          });
          setIsPreviewLoading(false);
          setPreviewLoadError(false);
          setCommentPage(1);
          setCurrentUserReviewId(null);
          setReviewRating(0);
          setReviewText('');
          setSubmitMessage('');
          setIsLoading(false);
          return;
        }

        setActiveDocumentId(resolvedDocumentId);
        setInlinePreviewUrl((current) => {
          if (current && current.startsWith('blob:')) {
            URL.revokeObjectURL(current);
          }
          return null;
        });
        setPreviewLoadError(false);
        setIsPreviewLoading(false);

        const document = await userService.getDocumentById(resolvedDocumentId);
        const [commentList, stats, related] = await Promise.all([
          userService.getComments(resolvedDocumentId),
          userService.getDocumentRatingStats(resolvedDocumentId),
          userService.getDocuments({ status: 'APPROVED', size: 3, sort: 'highest_rated' }).catch(() => []),
        ]);

        setDocumentTitle(document.title);
        setDocumentSubject(document.subject);
        setDocumentSemesterYear(document.semesterYear);
        setDocumentFileUrl(resolveDocumentPreviewUrl(resolvedDocumentId));
        setComments(commentList);
        setCommentPage(1);
        setRatingAverage(stats.average);
        setRatingCount(stats.count);
        applyUserReviewSnapshot(commentList);
        setRelatedDocuments(
          related
            .filter((item) => item.id !== resolvedDocumentId)
            .slice(0, 3)
            .map((item) => ({
              id: item.id,
              title: item.title,
              subject: item.subject,
              averageRating: item.averageRating,
              semesterYear: item.semesterYear,
            })),
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [documentId, navigate, applyUserReviewSnapshot]);

  useEffect(() => {
    if (!activeDocumentId) {
      return;
    }

    if (inlinePreviewUrl) {
      return;
    }

    let isCancelled = false;

    const loadPreview = async () => {
      setPreviewLoadError(false);
      setIsPreviewLoading(true);
      try {
        const previewBlob = await userService.getDocumentPreviewBlob(activeDocumentId);
        const previewUrl = URL.createObjectURL(previewBlob);

        if (isCancelled) {
          URL.revokeObjectURL(previewUrl);
          return;
        }

        setInlinePreviewUrl((current) => {
          if (current && current.startsWith('blob:')) {
            URL.revokeObjectURL(current);
          }
          return previewUrl;
        });
      } catch {
        if (!isCancelled) {
          setPreviewLoadError(true);
        }
      } finally {
        if (!isCancelled) {
          setIsPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      isCancelled = true;
    };
  }, [activeDocumentId, inlinePreviewUrl]);

  const handleOpenDocumentInNewTab = () => {
    if (inlinePreviewUrl) {
      window.open(inlinePreviewUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!documentFileUrl) {
      return;
    }

    window.open(documentFileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadDocument = async () => {
    if (!activeDocumentId) {
      return;
    }

    try {
      const previewBlob = await userService.getDocumentPreviewBlob(activeDocumentId);
      const downloadUrl = URL.createObjectURL(previewBlob);
      const extension = resolveExtensionFromMimeType(previewBlob.type);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = normalizeDownloadFileName(
        documentTitle,
        documentSubject,
        documentSemesterYear,
        extension,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      if (documentFileUrl) {
        window.open(documentFileUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleSubmitReview = async () => {
    if (!activeDocumentId) {
      return;
    }

    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      setSubmitMessage('Vui lòng đăng nhập để gửi đánh giá.');
      return;
    }
    if (reviewRating < 1) {
      setSubmitMessage('Vui lòng chọn số sao trước khi gửi.');
      return;
    }

    try {
      const isUpdating = Boolean(currentUserReviewId);
      if (currentUserReviewId) {
        const removed = await userService.deleteReview(currentUserReviewId);
        if (!removed) {
          setSubmitMessage('Không thể cập nhật đánh giá cũ. Bạn chỉ có thể chỉnh sửa trong 24 giờ sau khi gửi.');
          return;
        }
      }

      await userService.createOrUpdateReview(activeDocumentId, reviewRating, reviewText);
      const [nextComments, nextStats] = await Promise.all([
        userService.getComments(activeDocumentId),
        userService.getDocumentRatingStats(activeDocumentId),
      ]);
      setComments(nextComments);
      setCommentPage(1);
      setRatingAverage(nextStats.average);
      setRatingCount(nextStats.count);
      applyUserReviewSnapshot(nextComments);
      setSubmitMessage(isUpdating ? 'Đã cập nhật đánh giá thành công.' : 'Đã gửi đánh giá thành công.');
    } catch (error) {
      console.error(error);
      setSubmitMessage('Không thể gửi đánh giá. Vui lòng đăng nhập và thử lại.');
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center text-slate-500 font-semibold">Đang tải thảo luận...</div>;
  }

  const totalCommentPages = Math.max(1, Math.ceil(comments.length / COMMENTS_PER_PAGE));
  const safeCommentPage = Math.min(commentPage, totalCommentPages);
  const pagedComments = comments.slice(
    (safeCommentPage - 1) * COMMENTS_PER_PAGE,
    safeCommentPage * COMMENTS_PER_PAGE,
  );

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Breadcrumbs & Title Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <nav className="flex items-center text-sm text-slate-500 gap-2">
            <span>Thư viện</span>
            <ChevronRight size={14} />
            <span>Toán học</span>
            <ChevronRight size={14} />
            <span className="text-[#003466] font-bold">Chi tiết thảo luận</span>
          </nav>
          <h1 className="text-4xl font-black text-[#003466] tracking-tight">
            {documentTitle}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
              <Star size={16} fill="#ffa825" className="text-[#ffa825] mr-1" />
              <span className="font-bold text-[#ffa825]">{ratingAverage.toFixed(1)}</span>
              <span className="text-slate-400 ml-1 font-medium">/ 5</span>
            </div>
            <span className="text-slate-500 font-medium">({ratingCount} đánh giá)</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenDocumentInNewTab}
            disabled={!documentFileUrl && !inlinePreviewUrl}
            className="px-8 py-3.5 rounded-xl font-bold shadow-lg active:scale-95 transition-all bg-white border border-[#003466] text-[#003466] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Mở đề thẻ mới
          </button>
          <button
            onClick={handleDownloadDocument}
            disabled={!activeDocumentId}
            className="px-8 py-3.5 rounded-xl font-bold shadow-lg active:scale-95 transition-all bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Download đề
          </button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-[#003466]">Xem nội dung đề thi</h2>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {isPreviewLoading ? (
            <div className="p-8 text-center">
              <p className="text-slate-600 font-semibold">Đang tải nội dung đề...</p>
            </div>
          ) : previewLoadError ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-slate-600 font-semibold">Không thể hiển thị đề trực tiếp trong trang này.</p>
              <button
                onClick={handleOpenDocumentInNewTab}
                className="px-5 py-2.5 rounded-xl bg-[#003466] text-white font-bold text-sm"
              >
                Mở đề ở tab mới
              </button>
            </div>
          ) : !inlinePreviewUrl ? (
            <div className="p-8 text-center">
              <p className="text-slate-600 font-semibold">Chưa có dữ liệu xem trước.</p>
            </div>
          ) : (
            <iframe
              src={inlinePreviewUrl}
              title={`Noi dung de ${documentTitle}`}
              className="w-full h-[70vh]"
              onError={() => setPreviewLoadError(true)}
            />
          )}
        </div>
      </section>

      {/* 2. Bento Grid: Stats & Ratings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Rating Overview */}
        <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-12 items-center">
          <div className="text-center space-y-2 min-w-[140px]">
            <span className="text-6xl font-black text-[#003466]">4.5</span>
            <div className="flex justify-center text-[#ffa825]">
              {[...Array(4)].map((_, i) => <Star key={i} size={20} fill="currentColor" />)}
              <Star size={20} className="opacity-40" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Trung bình</p>
          </div>
          
          <div className="flex-1 w-full space-y-3">
            {[
              { label: "5 sao", percent: 75 },
              { label: "4 sao", percent: 15 },
              { label: "3 sao", percent: 6 },
              { label: "2 sao", percent: 2 },
              { label: "1 sao", percent: 2 },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500 w-12">{row.label}</span>
                <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${row.percent}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-400 w-10 text-right">{row.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats Widget */}
        <div className="lg:col-span-4 bg-[#eef4ff] p-8 rounded-3xl border border-blue-100 flex flex-col justify-center space-y-6">
          <h3 className="font-bold text-[#003466] flex items-center gap-2">
            <BarChart2 size={20} /> Thống kê nhanh
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-600">
                <Users size={18} />
                <span className="text-sm font-medium">Số người đã làm</span>
              </div>
              <span className="font-black text-[#003466]">1,402</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-600">
                <Award size={18} />
                <span className="text-sm font-medium">Độ khó cộng đồng</span>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg uppercase">Trung bình</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Discussion Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Discussion Area */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Write Review Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-[#003466]">Viết đánh giá của bạn</h2>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200/50">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-bold text-slate-600">Chấm điểm:</span>
                <div className="flex gap-1 text-slate-300">
                  {[...Array(5)].map((_, i) => (
                    <button key={i} onClick={() => setReviewRating(i + 1)} className="cursor-pointer transition-colors">
                      <Star size={24} className={reviewRating >= i + 1 ? 'text-[#ffa825]' : 'text-slate-300'} fill={reviewRating >= i + 1 ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <textarea 
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full bg-white rounded-2xl p-5 border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-[#003466] min-h-[140px] text-sm transition-all"
                  placeholder="Chia sẻ cảm nghĩ của bạn về độ khó, kiến thức và chất lượng đề thi..."
                />
                <div className="flex justify-between items-center">
                  <button className="flex items-center gap-2 text-[#003466] font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-all text-sm">
                    <ImageIcon size={20} /> Thêm hình ảnh
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    className="bg-[#003466] text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-md"
                  >
                    Gửi đánh giá
                  </button>
                </div>
                {submitMessage && <p className="text-xs text-slate-500 font-semibold">{submitMessage}</p>}
              </div>
            </div>
          </section>

          {/* Filter & Comment List */}
          <section className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-6">
              <h2 className="text-2xl font-bold text-[#003466]">Thảo luận cộng đồng</h2>
              <div className="flex items-center gap-2">
                {['Mới nhất', 'Đánh giá cao', 'Có hình ảnh'].map((filter, i) => (
                  <button key={filter} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${i === 0 ? 'bg-[#003466] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-10">
              {pagedComments.map((comment) => (
                <div key={comment.id} className="group">
                  <div className="flex items-start gap-5">
                    <img src={comment.avatar} alt="avt" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-[#003466]">{comment.author}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex text-[#ffa825]">
                              {[...Array(comment.rating)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                            </div>
                            <span className="text-[11px] text-slate-400 font-bold uppercase">{comment.time}</span>
                          </div>
                        </div>
                        <button className="text-slate-300 hover:text-slate-600 transition-colors">
                          <MoreHorizontal size={20} />
                        </button>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[15px]">
                        {comment.content}
                      </p>
                      {comment.image && (
                        <div className="pt-2">
                          <img src={comment.image} alt="attached" className="w-40 h-28 object-cover rounded-2xl border border-slate-100 shadow-sm hover:scale-105 transition-transform cursor-zoom-in" />
                        </div>
                      )}
                      <div className="flex items-center gap-8 pt-2">
                        <button className="flex items-center gap-1.5 text-xs font-black text-[#003466] hover:opacity-70">
                          <ThumbsUp size={16} /> Thích ({comment.likes})
                        </button>
                        <button className="flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-[#003466]">
                          <Reply size={16} /> Phản hồi
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalCommentPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={safeCommentPage}
                  totalPages={totalCommentPages}
                  onPageChange={setCommentPage}
                />
              </div>
            )}

            <button className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all">
              Tổng cộng {comments.length} bình luận
            </button>
          </section>
        </div>

        {/* Sidebar Info */}
        <aside className="lg:col-span-4 space-y-8">
          {/* Instructor Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-500 uppercase text-[11px] tracking-widest">Người tạo đề</h3>
            <div className="flex items-center gap-4">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Son" alt="TS" className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-100" />
              <div>
                <p className="font-black text-[#003466]">TS. Đặng Văn Sơn</p>
                <p className="text-xs text-slate-500 font-medium">Chuyên gia Toán Cao cấp</p>
                <div className="flex items-center gap-1 mt-1 text-emerald-600">
                  <Verified size={14} fill="currentColor" className="text-white" />
                  <span className="text-[10px] font-black uppercase">Đã xác thực</span>
                </div>
              </div>
            </div>
            <button className="w-full bg-slate-50 text-[#003466] py-3 rounded-xl text-xs font-black border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all">
              Theo dõi giảng viên
            </button>
          </div>

          {/* Related Exams */}
          <div className="space-y-6">
            <h3 className="font-bold text-[#003466] text-lg">Đề thi liên quan</h3>
            <div className="space-y-4">
              {relatedDocuments.map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => navigate(`/user/comment/${exam.id}`)}
                  className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
                >
                  <span className="text-[10px] font-black px-2 py-1 rounded bg-blue-50 text-blue-700">{exam.subject ?? 'Đa môn'}</span>
                  <h4 className="font-bold text-[#003466] mt-3 group-hover:text-blue-600 transition-colors">{exam.title}</h4>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-[11px] text-slate-400 font-medium">{exam.semesterYear ?? 'N/A'}</span>
                    <div className="flex items-center gap-1 text-[#ffa825]">
                      <Star size={12} fill="currentColor" />
                      <span className="text-xs font-black">{(exam.averageRating ?? 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {relatedDocuments.length === 0 && (
                <p className="text-sm text-slate-400">Chưa có đề liên quan.</p>
              )}
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="bg-[#003466] rounded-3xl p-8 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <h4 className="font-black text-2xl text-white leading-tight">Học không giới hạn</h4>
              <p className="text-blue-100/70 text-sm">Nâng cấp tài khoản Scholar Core để xem lời giải chi tiết và video bài giảng.</p>
              <button className="w-full bg-[#6bff8f] text-[#005321] py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform">
                Nâng cấp ngay
              </button>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Award size={160} className="text-white" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}