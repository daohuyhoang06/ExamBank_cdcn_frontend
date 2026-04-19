import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  Star,
  Check,
  Eye,
  Download,
  ExternalLink,
  School,
  BookMarked,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination/pagination';

import type { DocumentSummary, EducationLevel, Subject } from '../types/user.type';
import { userService } from '../services/user.service';

const DOCUMENTS_PER_PAGE = 5;

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

export default function ExamBankPage() {
  const navigate = useNavigate();

  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [keyword, setKeyword] = useState('');
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null);
  const [inlinePreviewUrl, setInlinePreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState('');

  const totalPages = Math.max(1, Math.ceil(documents.length / DOCUMENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedDocuments = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * DOCUMENTS_PER_PAGE;
    return documents.slice(startIndex, startIndex + DOCUMENTS_PER_PAGE);
  }, [documents, safeCurrentPage]);

  const activeDocument = useMemo(
    () => documents.find((document) => document.id === activeDocumentId) ?? null,
    [documents, activeDocumentId],
  );

  const fallbackPreviewUrl = useMemo(
    () => resolveDocumentPreviewUrl(activeDocument?.id),
    [activeDocument?.id],
  );

  useEffect(() => {
    return () => {
      if (inlinePreviewUrl && inlinePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(inlinePreviewUrl);
      }
    };
  }, [inlinePreviewUrl]);

  const loadApprovedDocuments = async (nextKeyword = '', nextSubject = '') => {
    setIsLoadingDocuments(true);
    setDocumentsError('');

    try {
      const result = await userService.getDocuments({
        keyword: nextKeyword.trim() || undefined,
        subject: nextSubject && nextSubject !== 'Tất cả môn học' ? nextSubject : undefined,
        sortBy: 'NEWEST',
        size: 200,
      });

      setDocuments(result);
      setCurrentPage(1);
      setActiveDocumentId((previousId) => {
        if (previousId && result.some((item) => item.id === previousId)) {
          return previousId;
        }
        return result.length > 0 ? result[0].id : null;
      });
    } catch (error) {
      console.error('Fetch documents error:', error);
      setDocuments([]);
      setActiveDocumentId(null);
      setDocumentsError('Không thể tải đề thi từ hệ thống. Vui lòng thử lại.');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const levels = await userService.getEducationLevels();
        const subs = await userService.getSubjects();

        setEducationLevels(levels);
        setSubjects(subs);

        if (levels.length > 0) {
          setSelectedLevel(levels[0]);
        }
        if (subs.length > 0) {
          setSelectedSubject(subs[0]);
        }

        await loadApprovedDocuments('', '');
      } catch (error) {
        console.error('Fetch error:', error);
      }
    };

    void fetchData();
  }, []);

  const applyFilters = async (nextKeyword = keyword, nextSubject = selectedSubject) => {
    await loadApprovedDocuments(nextKeyword, nextSubject);
  };

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (pagedDocuments.length === 0) {
      return;
    }

    if (!activeDocumentId || !pagedDocuments.some((document) => document.id === activeDocumentId)) {
      setActiveDocumentId(pagedDocuments[0].id);
    }
  }, [activeDocumentId, pagedDocuments]);

  useEffect(() => {
    if (!activeDocumentId) {
      setInlinePreviewUrl((current) => {
        if (current && current.startsWith('blob:')) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      setPreviewLoadError(false);
      setIsPreviewLoading(false);
      return;
    }

    let isCancelled = false;

    const loadPreview = async () => {
      setIsPreviewLoading(true);
      setPreviewLoadError(false);

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
          setInlinePreviewUrl((current) => {
            if (current && current.startsWith('blob:')) {
              URL.revokeObjectURL(current);
            }
            return null;
          });
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
  }, [activeDocumentId]);

  const handleOpenInNewTab = () => {
    if (inlinePreviewUrl) {
      window.open(inlinePreviewUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (fallbackPreviewUrl) {
      window.open(fallbackPreviewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadDocument = async () => {
    if (!activeDocument) {
      return;
    }

    setIsDownloading(true);
    try {
      const previewBlob = await userService.getDocumentPreviewBlob(activeDocument.id);
      const downloadUrl = URL.createObjectURL(previewBlob);
      const extension = resolveExtensionFromMimeType(previewBlob.type);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = normalizeDownloadFileName(
        activeDocument.title,
        activeDocument.subject,
        activeDocument.semesterYear,
        extension,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      handleOpenInNewTab();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="bg-[#003466] rounded-[2rem] p-8 text-white relative overflow-hidden">
        <h1 className="text-3xl font-black mb-2">Thư viện đề thi</h1>
        <p className="text-blue-200/70 text-sm font-medium">
          Tìm kiếm trong 50,000+ đề thi chất lượng cao
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 relative z-50">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tên đề thi..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 font-bold"
          />
        </div>

        <div className="relative w-full md:w-64">
          <button
            onClick={() => {
              setIsLevelOpen(!isLevelOpen);
              setIsSubjectOpen(false);
            }}
            className="w-full flex items-center justify-between px-5 py-3 border rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <School className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-sm">{selectedLevel?.name || 'Chọn lớp'}</span>
            </div>
            <ChevronDown className={`w-4 h-4 ${isLevelOpen ? 'rotate-180' : ''}`} />
          </button>

          {isLevelOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg max-h-80 overflow-y-auto z-50">
              {educationLevels.map((level) => (
                <div
                  key={level.id}
                  onClick={() => {
                    setSelectedLevel(level);
                    setIsLevelOpen(false);
                  }}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between"
                >
                  <span>{level.name}</span>
                  {selectedLevel?.id === level.id && <Check />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative w-full md:w-64">
          <button
            onClick={() => {
              setIsSubjectOpen(!isSubjectOpen);
              setIsLevelOpen(false);
            }}
            className="w-full flex items-center justify-between px-5 py-3 border rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <BookMarked className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-sm">{selectedSubject || 'Chọn môn'}</span>
            </div>
            <ChevronDown className={`w-4 h-4 ${isSubjectOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSubjectOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg z-50">
              {subjects.map((subject) => (
                <div
                  key={subject}
                  onClick={() => {
                    setSelectedSubject(subject);
                    setIsSubjectOpen(false);
                    void applyFilters(keyword, subject);
                  }}
                  className="px-4 py-3 hover:bg-indigo-50 cursor-pointer flex justify-between"
                >
                  <span>{subject}</span>
                  {selectedSubject === subject && <Check />}
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => void applyFilters()} className="px-6 py-3 bg-blue-600 text-white rounded-2xl">
          Lọc
        </button>
      </div>

      {documentsError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-700 font-semibold text-sm">
          {documentsError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">Danh sách đề</p>
            <p className="text-xs font-semibold text-slate-400">{documents.length} đề</p>
          </div>

          <div className="space-y-3">
            {pagedDocuments.map((document) => {
              const isActive = document.id === activeDocumentId;

              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => setActiveDocumentId(document.id)}
                  className={`w-full text-left bg-white rounded-2xl border p-4 transition-all ${
                    isActive ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-100 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">{document.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {document.subject ?? selectedSubject ?? 'Đa môn'} • {document.semesterYear ?? 'Chưa cập nhật kỳ/năm'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-yellow-500 shrink-0">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-xs font-bold">{(document.averageRating ?? 0).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-blue-700">
                    <span className="inline-flex items-center gap-1">
                      <Eye size={14} /> Xem trực tiếp
                    </span>
                    <span
                      className="inline-flex items-center gap-1 hover:text-blue-900"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/user/comment/${document.id}`);
                      }}
                    >
                      Chi tiết
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {documents.length > DOCUMENTS_PER_PAGE && (
            <div className="flex justify-center">
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </section>

        <section className="lg:col-span-7">
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden min-h-[640px]">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {activeDocument?.title ?? 'Chọn đề để xem trước'}
                </p>
                {activeDocument && (
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    {activeDocument.subject ?? 'Đa môn'} • {activeDocument.semesterYear ?? 'Chưa cập nhật kỳ/năm'}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!activeDocument}
                  onClick={handleOpenInNewTab}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ExternalLink size={14} /> Mở tab mới
                </button>
                <button
                  type="button"
                  disabled={!activeDocument || isDownloading}
                  onClick={() => void handleDownloadDocument()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  <Download size={14} /> {isDownloading ? 'Đang tải...' : 'Tải đề'}
                </button>
              </div>
            </div>

            <div className="h-[560px] bg-slate-50">
              {!activeDocument && (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                  Chưa có đề để hiển thị.
                </div>
              )}

              {activeDocument && isPreviewLoading && (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm font-semibold">
                  Đang tải xem trước đề...
                </div>
              )}

              {activeDocument && !isPreviewLoading && previewLoadError && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500 px-6 text-center">
                  <p className="text-sm font-semibold">Không thể xem trước trực tiếp đề này.</p>
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white"
                  >
                    <ExternalLink size={14} /> Mở đề trong tab mới
                  </button>
                </div>
              )}

              {activeDocument && !isPreviewLoading && !previewLoadError && inlinePreviewUrl && (
                <iframe
                  title={`preview-${activeDocument.id}`}
                  src={inlinePreviewUrl}
                  className="w-full h-full bg-white"
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {!isLoadingDocuments && documents.length === 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-500">
          Không tìm thấy đề phù hợp bộ lọc hiện tại.
        </div>
      )}

      {isLoadingDocuments && (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-500">
          Đang tải danh sách đề...
        </div>
      )}
    </div>
  );
}