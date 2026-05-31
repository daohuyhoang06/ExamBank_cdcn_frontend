
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Star,
  ChevronRight,
  Eye,
  Download,
  BarChart2,
  Image as ImageIcon,
  MoreHorizontal,
  ThumbsUp,
  Reply,
  Award,
  Lock
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination/pagination';
import type { Comment } from '../types/user.type';
import { userService } from '../services/user.service';
import { getStoredAuthUser } from '@/features/auth/services/auth.service';

const COMMENTS_PER_PAGE = 5;
const REVIEW_DISCUSSION_PREFIX = 'review-link:';

const looksLikeMojibake = (value: string): boolean => /(Ã.|Â.|Æ.|Ð.|áº|á»|Ä.)/.test(value);

const repairMojibakeText = (value?: string): string => {
  const raw = value ?? '';
  if (!raw || !looksLikeMojibake(raw)) {
    return raw;
  }

  let repaired = raw;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const bytes = new Uint8Array([...repaired].map((char) => char.charCodeAt(0)));

    try {
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!decoded || decoded === repaired) {
        break;
      }
      repaired = decoded;
      if (!looksLikeMojibake(repaired)) {
        break;
      }
    } catch {
      break;
    }
  }

  return repaired;
};

type CommentReplyItem = {
  id: number;
  author: string;
  content: string;
  createdAt?: string;
  authorId?: number;
  avatarUrl?: string;
};

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

const formatReplyTime = (value?: string): string => {
  if (!value) {
    return 'Vừa xong';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Vừa xong';
  }

  return parsed.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const buildAvatarUrl = (seed: string): string => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
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
  const [documentViewCount, setDocumentViewCount] = useState(0);
  const [documentDownloadCount, setDocumentDownloadCount] = useState(0);
  const [documentFullAccess, setDocumentFullAccess] = useState(true);
  const [documentRequiresUnlock, setDocumentRequiresUnlock] = useState(false);
  const [documentUnlockCoinCost, setDocumentUnlockCoinCost] = useState(5);
  const [isUnlockingDocument, setIsUnlockingDocument] = useState(false);
  const [documentUnlockError, setDocumentUnlockError] = useState('');
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [commentPage, setCommentPage] = useState(1);
  const [currentUserReviewId, setCurrentUserReviewId] = useState<number | null>(null);
  const [replyingCommentId, setReplyingCommentId] = useState<number | null>(null);
  const [replyDraftByCommentId, setReplyDraftByCommentId] = useState<Record<number, string>>({});
  const [isSubmittingReplyCommentId, setIsSubmittingReplyCommentId] = useState<number | null>(null);
  const [replyItemsByCommentId, setReplyItemsByCommentId] = useState<Record<number, CommentReplyItem[]>>({});
  const [isLoadingReplyItemsForCommentId, setIsLoadingReplyItemsForCommentId] = useState<number | null>(null);

  const getCurrentUserId = useCallback((): number | null => {
    const storedUser = getStoredAuthUser();
    const rawId = storedUser?.id;
    if (rawId === undefined || rawId === null || String(rawId).trim().length === 0) {
      return null;
    }
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const buildReviewDiscussionTitle = useCallback((reviewId: number): string => {
    return `${REVIEW_DISCUSSION_PREFIX}${reviewId}`;
  }, []);

  const parseReviewIdFromDiscussionTitle = useCallback((title?: string): number | null => {
    if (!title) {
      return null;
    }
    const normalized = title.trim();
    if (!normalized.startsWith(REVIEW_DISCUSSION_PREFIX)) {
      return null;
    }
    const rawId = normalized.slice(REVIEW_DISCUSSION_PREFIX.length).trim();
    const parsed = Number(rawId);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, []);

  const buildReviewDiscussionContent = useCallback((comment: Comment): string => {
    const base = [
      `Linked review from user: ${comment.author}.`,
      `Star rating: ${comment.rating}/5.`,
      `Review content: ${(comment.content ?? '').trim()}`,
    ].join(' ');
    if (base.length >= 50) {
      return base.slice(0, 5000);
    }
    return `${base} Additional context to satisfy discussion length requirement.`.slice(0, 5000);
  }, []);

  const mergeDiscussionIntoComments = useCallback(
    (
      reviewList: Comment[],
      discussions: Array<{ id: number; title?: string; upvoteCount?: number; viewerUpvoted?: boolean; replyCount?: number }>,
    ): Comment[] => {
      const discussionByReviewId = new Map<number, { id: number; upvoteCount?: number; viewerUpvoted?: boolean; replyCount?: number }>();

      discussions.forEach((discussion) => {
        const reviewId = parseReviewIdFromDiscussionTitle(discussion.title);
        if (!reviewId) {
          return;
        }
        discussionByReviewId.set(reviewId, {
          id: discussion.id,
          upvoteCount: discussion.upvoteCount,
          viewerUpvoted: discussion.viewerUpvoted,
          replyCount: discussion.replyCount,
        });
      });

      return reviewList.map((review) => {
        const discussion = discussionByReviewId.get(review.id);
        if (!discussion) {
          return {
            ...review,
            likes: 0,
            viewerUpvoted: false,
            replyCount: 0,
            discussionId: undefined,
          };
        }
        return {
          ...review,
          likes: discussion.upvoteCount ?? 0,
          viewerUpvoted: Boolean(discussion.viewerUpvoted),
          replyCount: discussion.replyCount ?? 0,
          discussionId: discussion.id,
        };
      });
    },
    [parseReviewIdFromDiscussionTitle],
  );

  const applyUserReviewSnapshot = useCallback((commentList: Comment[]) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      setCurrentUserReviewId(null);
      setReviewRating(0);
      setReviewText('');
      return;
    }

    const existing = commentList.find((item) => item.userId === currentUserId);
    setCurrentUserReviewId(existing?.id ?? null);
    setReviewRating(0);
    setReviewText('');
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
          setReplyingCommentId(null);
          setReplyDraftByCommentId({});
          setReplyItemsByCommentId({});
          setIsLoadingReplyItemsForCommentId(null);
          setIsSubmittingReplyCommentId(null);
          setSubmitMessage('');
          setDocumentViewCount(0);
          setDocumentDownloadCount(0);
          setDocumentFullAccess(true);
          setDocumentRequiresUnlock(false);
          setDocumentUnlockError('');
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
        setReplyingCommentId(null);
        setReplyDraftByCommentId({});
        setReplyItemsByCommentId({});
        setIsLoadingReplyItemsForCommentId(null);
        setIsSubmittingReplyCommentId(null);

        let document: Awaited<ReturnType<typeof userService.getDocumentById>> | null = null;
        try {
          document = await userService.getDocumentById(resolvedDocumentId);
        } catch (error) {
          console.error('Failed to fetch document detail endpoint:', error);
        }
        const [commentList, stats, related, discussions] = await Promise.all([
          userService.getComments(resolvedDocumentId),
          userService.getDocumentRatingStats(resolvedDocumentId),
          userService.getDocuments({ status: 'APPROVED', size: 3, sort: 'highest_rated' }).catch(() => []),
          userService.getDocumentDiscussions(resolvedDocumentId),
        ]);

        if (document) {
          const repairedTitle = repairMojibakeText(document.title);
          const repairedSubject = repairMojibakeText(document.subject);
          const repairedSemesterYear = repairMojibakeText(document.semesterYear);

          setDocumentTitle(repairedTitle || 'Chi tiết đề thi');
          setDocumentSubject(repairedSubject || undefined);
          setDocumentSemesterYear(repairedSemesterYear || undefined);
          const viewCount = Number(document.viewCount ?? 0);
          setDocumentViewCount(Number.isFinite(viewCount) ? Math.max(0, Math.floor(viewCount)) : 0);
          setDocumentDownloadCount(Math.max(0, Math.floor(document.downloadCount ?? 0)));
          setDocumentFullAccess(document.fullAccess !== false);
          setDocumentRequiresUnlock(Boolean(document.requiresUnlock));
          setDocumentUnlockCoinCost(document.unlockCoinCost ?? 10);
          setDocumentUnlockError('');
        } else {
          setDocumentTitle('Chi tiết đề thi');
          setDocumentSubject(undefined);
          setDocumentSemesterYear(undefined);
          setDocumentViewCount(0);
          setDocumentDownloadCount(0);
          setDocumentFullAccess(true);
          setDocumentRequiresUnlock(false);
          setDocumentUnlockError('');
        }
        setDocumentFileUrl(resolveDocumentPreviewUrl(resolvedDocumentId));
        setComments(mergeDiscussionIntoComments(commentList, discussions));
        setCommentPage(1);
        setRatingAverage(stats.average);
        applyUserReviewSnapshot(commentList);
        setRelatedDocuments(
          related
            .filter((item) => item.id !== resolvedDocumentId)
            .slice(0, 3)
            .map((item) => {
              const subject = repairMojibakeText(item.subject);
              const semesterYear = repairMojibakeText(item.semesterYear);

              return {
                id: item.id,
                title: repairMojibakeText(item.title),
                subject: subject || undefined,
                averageRating: item.averageRating,
                semesterYear: semesterYear || undefined,
              };
            }),
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [documentId, navigate, applyUserReviewSnapshot, mergeDiscussionIntoComments]);

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
    if (documentRequiresUnlock && !documentFullAccess) {
      void handleUnlockDocument();
      return;
    }
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

    if (documentRequiresUnlock && !documentFullAccess) {
      await handleUnlockDocument();
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

  const handleUnlockDocument = async () => {
    if (!activeDocumentId || isUnlockingDocument) {
      return;
    }

    setIsUnlockingDocument(true);
    setDocumentUnlockError('');
    try {
      await userService.unlockDocument(activeDocumentId);
      const document = await userService.getDocumentById(activeDocumentId);
      setDocumentFullAccess(document.fullAccess !== false);
      setDocumentRequiresUnlock(Boolean(document.requiresUnlock));
      setDocumentUnlockCoinCost(document.unlockCoinCost ?? documentUnlockCoinCost);
      setPreviewLoadError(false);
      setInlinePreviewUrl((current) => {
        if (current && current.startsWith('blob:')) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
    } catch {
      setDocumentUnlockError('Không thể mở khóa tài liệu. Vui lòng kiểm tra coin hoặc nâng cấp premium.');
    } finally {
      setIsUnlockingDocument(false);
    }
  };

  const ensureDiscussionForComment = useCallback(async (comment: Comment): Promise<number | null> => {
    if (!activeDocumentId) {
      return null;
    }

    if (comment.discussionId) {
      return comment.discussionId;
    }

    const created = await userService.createDocumentDiscussionThread(activeDocumentId, {
      title: buildReviewDiscussionTitle(comment.id),
      content: buildReviewDiscussionContent(comment),
      type: 'GENERAL',
    });

    const discussionId = created?.id;
    if (!discussionId) {
      return null;
    }

    setComments((prev) =>
      prev.map((item) =>
        item.id === comment.id
          ? { ...item, discussionId, likes: item.likes ?? 0, replyCount: item.replyCount ?? 0 }
          : item,
      ),
    );

    return discussionId;
  }, [activeDocumentId, buildReviewDiscussionContent, buildReviewDiscussionTitle]);

  const handleToggleCommentLike = async (comment: Comment) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      setSubmitMessage('Vui lòng đăng nhập để thích bình luận.');
      return;
    }

    const discussionId = await ensureDiscussionForComment(comment);
    if (!discussionId) {
      setSubmitMessage('Không thể cập nhật lượt thích lúc này.');
      return;
    }

    const isUpvoted = Boolean(comment.viewerUpvoted);
    const success = isUpvoted
      ? await userService.removeDiscussionUpvote(discussionId)
      : await userService.addDiscussionUpvote(discussionId);

    if (!success) {
      setSubmitMessage('Không thể cập nhật lượt thích. Vui lòng thử lại.');
      return;
    }

    setComments((prev) =>
      prev.map((item) => {
        if (item.id !== comment.id) {
          return item;
        }
        const nextLikes = isUpvoted ? Math.max(0, (item.likes ?? 0) - 1) : (item.likes ?? 0) + 1;
        return {
          ...item,
          discussionId,
          likes: nextLikes,
          viewerUpvoted: !isUpvoted,
        };
      }),
    );
  };

  const handleReplyToComment = async (comment: Comment) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      setSubmitMessage('Vui lòng đăng nhập để phản hồi bình luận.');
      return;
    }

    setSubmitMessage('');
    setReplyDraftByCommentId((prev) => (prev[comment.id] === undefined ? { ...prev, [comment.id]: '' } : prev));
    if (replyingCommentId === comment.id) {
      setReplyingCommentId(null);
      return;
    }

    setReplyingCommentId(comment.id);

    if (replyItemsByCommentId[comment.id] !== undefined) {
      return;
    }

    if (!comment.discussionId) {
      setReplyItemsByCommentId((prev) => ({ ...prev, [comment.id]: [] }));
      return;
    }

    setIsLoadingReplyItemsForCommentId(comment.id);
    const replies = await userService.getDiscussionReplies(comment.discussionId);
    setReplyItemsByCommentId((prev) => ({
      ...prev,
      [comment.id]: replies.map((reply) => ({
        id: reply.id,
        author: reply.author?.userName?.trim() || 'Người dùng',
        content: (reply.content ?? '').trim(),
        createdAt: reply.createdAt,
        authorId: reply.author?.userId,
        avatarUrl: buildAvatarUrl(String(reply.author?.userId ?? reply.author?.userName?.trim() ?? reply.id)),
      })),
    }));
    setIsLoadingReplyItemsForCommentId(null);
  };

  const handleSubmitInlineReply = async (comment: Comment) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      setSubmitMessage('Vui lòng đăng nhập để phản hồi bình luận.');
      return;
    }

    const normalizedReply = (replyDraftByCommentId[comment.id] ?? '').trim();
    if (normalizedReply.length === 0) {
      setSubmitMessage('Vui lòng nhập nội dung phản hồi.');
      return;
    }

    setIsSubmittingReplyCommentId(comment.id);

    const discussionId = await ensureDiscussionForComment(comment);
    if (!discussionId) {
      setSubmitMessage('Không thể tạo luồng phản hồi cho bình luận này.');
      setIsSubmittingReplyCommentId(null);
      return;
    }

    const success = await userService.createDiscussionReply(discussionId, normalizedReply);
    if (!success) {
      setSubmitMessage('Không thể gửi phản hồi. Vui lòng thử lại.');
      setIsSubmittingReplyCommentId(null);
      return;
    }

    setComments((prev) =>
      prev.map((item) =>
        item.id === comment.id
          ? { ...item, discussionId, replyCount: (item.replyCount ?? 0) + 1 }
          : item,
      ),
    );
    setReplyItemsByCommentId((prev) => {
      const existing = prev[comment.id] ?? [];
      return {
        ...prev,
        [comment.id]: [
          ...existing,
          {
            id: Date.now(),
            author: 'Bạn',
            content: normalizedReply,
            authorId: currentUserId,
            avatarUrl: buildAvatarUrl(String(currentUserId)),
          },
        ],
      };
    });
    setReplyDraftByCommentId((prev) => ({ ...prev, [comment.id]: '' }));
    setReplyingCommentId(null);
    setIsSubmittingReplyCommentId(null);
    setSubmitMessage('Đã gửi phản hồi thành công.');
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
      const [nextComments, nextStats, nextDiscussions] = await Promise.all([
        userService.getComments(activeDocumentId),
        userService.getDocumentRatingStats(activeDocumentId),
        userService.getDocumentDiscussions(activeDocumentId),
      ]);
      setComments(mergeDiscussionIntoComments(nextComments, nextDiscussions));
      setCommentPage(1);
      setRatingAverage(nextStats.average);
      setCurrentUserReviewId(
        nextComments.find((item) => item.userId === currentUserId)?.id ?? null,
      );
      setReviewRating(0);
      setReviewText('');
      setSubmitMessage(isUpdating ? 'Đã cập nhật đánh giá thành công.' : 'Đã gửi đánh giá thành công.');
    } catch (error) {
      console.error(error);
      setSubmitMessage('Không thể gửi đánh giá. Vui lòng đăng nhập và thử lại.');
    }
  };

  const totalCommentPages = Math.max(1, Math.ceil(comments.length / COMMENTS_PER_PAGE));
  const safeCommentPage = Math.min(commentPage, totalCommentPages);
  const pagedComments = comments.slice(
    (safeCommentPage - 1) * COMMENTS_PER_PAGE,
    safeCommentPage * COMMENTS_PER_PAGE,
  );
  const ratingBreakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];

    comments.forEach((comment) => {
      const normalizedRating = Math.round(comment.rating ?? 0);
      if (normalizedRating >= 1 && normalizedRating <= 5) {
        counts[normalizedRating - 1] += 1;
      }
    });

    const total = counts.reduce((sum, value) => sum + value, 0);
    return [5, 4, 3, 2, 1].map((star) => {
      const count = counts[star - 1];
      const percent = total === 0 ? 0 : Math.round((count / total) * 100);
      return {
        label: `${star} sao`,
        count,
        percent,
      };
    });
  }, [comments]);
  const roundedRatingAverage = Math.max(0, Math.min(5, Math.round(ratingAverage)));

  if (isLoading) {
    return <div className="py-20 text-center text-slate-500 font-semibold">Đang tải thảo luận...</div>;
  }

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
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenDocumentInNewTab}
            disabled={!documentFileUrl && !inlinePreviewUrl}
            className="px-8 py-3.5 rounded-xl font-bold shadow-lg active:scale-95 transition-all bg-white border border-[#003466] text-[#003466] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Mở đề ở tab mới
          </button>
          <button
            onClick={handleDownloadDocument}
            disabled={!activeDocumentId}
            className="px-8 py-3.5 rounded-xl font-bold shadow-lg active:scale-95 transition-all bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Tải đề
          </button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-[#003466]">Xem nội dung đề thi</h2>

        <div className="relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
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
              className={`w-full ${documentRequiresUnlock && !documentFullAccess ? 'h-[42vh] blur-[1.5px]' : 'h-[70vh]'}`}
              onError={() => setPreviewLoadError(true)}
            />
          )}
          {documentRequiresUnlock && !documentFullAccess ? (
            <div className="absolute inset-x-0 bottom-0 flex min-h-[46%] flex-col items-center justify-end bg-gradient-to-t from-white via-white/95 to-white/20 p-6 text-center">
              <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-lg">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-amber-900">
                  <Lock size={18} />
                </div>
                <p className="text-sm font-black text-amber-950">Mở khóa để xem toàn bộ nội dung</p>
                <p className="mt-1 text-xs font-semibold text-amber-800">
                  Tài khoản premium xem tự do. User thường sẽ bị trừ {documentUnlockCoinCost} coin.
                </p>
                {documentUnlockError ? <p className="mt-2 text-xs text-red-700">{documentUnlockError}</p> : null}
                <button
                  onClick={() => void handleUnlockDocument()}
                  disabled={isUnlockingDocument}
                  className="mt-3 rounded-full bg-[#003466] px-5 py-2 text-xs font-black text-white hover:bg-[#0b457e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUnlockingDocument ? 'Đang mở khóa...' : `Mở khóa (${documentUnlockCoinCost} coin)`}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* 2. Bento Grid: Stats & Ratings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Rating Overview */}
        <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-12 items-center">
          <div className="text-center space-y-2 min-w-[140px]">
            <span className="text-6xl font-black text-[#003466]">{ratingAverage.toFixed(1)}</span>
            <div className="flex justify-center text-[#ffa825]">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  className={i < roundedRatingAverage ? 'text-[#ffa825]' : 'text-slate-300'}
                  fill={i < roundedRatingAverage ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Trung bình</p>
          </div>
          
          <div className="flex-1 w-full space-y-3">
            {ratingBreakdown.map((row) => (
              <div key={row.label} className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500 w-12">{row.label}</span>
                <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${row.percent}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-400 w-20 text-right">
                  {row.percent}% ({row.count})
                </span>
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
                <Eye size={18} />
                <span className="text-sm font-medium">Số lượt xem</span>
              </div>
              <span className="font-black text-[#003466]">{documentViewCount.toLocaleString('vi-VN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-600">
                <Download size={18} />
                <span className="text-sm font-medium">Số lượt tải</span>
              </div>
              <span className="font-black text-[#003466]">{documentDownloadCount.toLocaleString('vi-VN')}</span>
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
            <div className="space-y-5">
              {pagedComments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-[18px] bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 sm:p-5"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={comment.avatar}
                      alt="avt"
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm sm:h-11 sm:w-11"
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <h4 className="truncate text-[15px] font-extrabold text-[#0f2a46]">{comment.author}</h4>
                          <div className="mt-1 flex items-center gap-2.5">
                            <div className="flex text-[#ffa825]">
                              {[...Array(comment.rating)].map((_, i) => <Star key={i} size={13} fill="currentColor" />)}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400">{comment.time}</span>
                          </div>
                        </div>
                        <button className="text-slate-300 transition-colors hover:text-slate-500">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                      <p className="text-[14px] leading-relaxed text-slate-700 sm:text-[15px]">
                        {comment.content}
                      </p>
                      {comment.image && (
                        <img
                          src={comment.image}
                          alt="attached"
                          className="h-28 w-40 rounded-2xl object-cover shadow-sm transition-transform hover:scale-[1.02] sm:h-32 sm:w-48"
                        />
                      )}
                      <div className="flex flex-wrap items-center gap-5 pt-1">
                        <button
                          onClick={() => void handleToggleCommentLike(comment)}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold transition ${
                            comment.viewerUpvoted ? 'text-emerald-600 hover:text-emerald-500' : 'text-slate-500 hover:text-[#0f2a46]'
                          }`}
                        >
                          <ThumbsUp size={15} /> Thích ({comment.likes})
                        </button>
                        <button
                          onClick={() => void handleReplyToComment(comment)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-[#0f2a46]"
                        >
                          <Reply size={15} /> Phản hồi ({comment.replyCount ?? 0})
                        </button>
                      </div>
                      {replyingCommentId === comment.id && (
                        <div className="ml-2 space-y-3 pt-1 sm:ml-3">
                          <div className="relative space-y-3 pl-4 before:absolute before:bottom-1 before:left-1 before:top-1 before:w-px before:bg-slate-200 sm:pl-5">
                            {isLoadingReplyItemsForCommentId === comment.id ? (
                              <p className="text-xs font-semibold text-slate-400">Đang tải phản hồi...</p>
                            ) : (replyItemsByCommentId[comment.id] ?? []).length === 0 ? (
                              <p className="text-xs font-semibold text-slate-400">Chưa có phản hồi nào.</p>
                            ) : (
                              <div className="space-y-2.5">
                                {(replyItemsByCommentId[comment.id] ?? []).map((reply) => (
                                  <div key={reply.id} className="rounded-2xl bg-[#F5F7FB] px-3 py-2.5 shadow-[0_1px_1px_rgba(15,23,42,0.04)]">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex min-w-0 items-center gap-2">
                                        {reply.avatarUrl ? (
                                          <img
                                            src={reply.avatarUrl}
                                            alt={reply.author}
                                            className="h-6 w-6 shrink-0 rounded-full object-cover"
                                          />
                                        ) : null}
                                        <span className="truncate text-xs font-bold text-[#0f2a46]">{reply.author}</span>
                                      </div>
                                      <span className="text-[11px] font-semibold text-slate-400">
                                        {formatReplyTime(reply.createdAt)}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600">{reply.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="rounded-2xl bg-[#F5F7FB] p-2.5 sm:p-3">
                            <div className="flex items-start gap-2.5">
                              <div className="min-w-0 flex-1 space-y-2.5">
                                <textarea
                                  value={replyDraftByCommentId[comment.id] ?? ''}
                                  onChange={(event) =>
                                    setReplyDraftByCommentId((prev) => ({ ...prev, [comment.id]: event.target.value }))
                                  }
                                  className="w-full min-h-[72px] rounded-xl border border-transparent bg-white px-3 py-2.5 text-sm text-slate-700 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.26)] outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                placeholder="Viết phản hồi tự nhiên, rõ ràng và tôn trọng..."
                                />
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setReplyingCommentId(null)}
                                      className="h-10 rounded-xl bg-white px-4 text-xs font-bold text-slate-600 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.35)] transition hover:bg-slate-50"
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleSubmitInlineReply(comment)}
                                      disabled={
                                        isSubmittingReplyCommentId === comment.id
                                        || (replyDraftByCommentId[comment.id] ?? '').trim().length === 0
                                      }
                                      className="h-10 rounded-xl bg-[#1f66d1] px-4 text-xs font-bold text-white shadow-[0_10px_20px_rgba(31,102,209,0.24)] transition hover:bg-[#1956b2] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                  {isSubmittingReplyCommentId === comment.id ? 'Đang gửi...' : 'Gửi phản hồi'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
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



