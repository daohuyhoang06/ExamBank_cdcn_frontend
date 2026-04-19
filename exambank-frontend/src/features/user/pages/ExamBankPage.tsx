import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Calendar, School, ChevronDown, Check, BookMarked } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination/pagination';

import type { DocumentSummary, EducationLevel, Subject } from '../types/user.type';
import { userService } from '../services/user.service';

const DOCUMENTS_PER_PAGE = 9;
const ALL_SUBJECTS = 'Tất cả môn học';
const ALL_LEVELS: EducationLevel = { id: 'all', name: 'Tất cả lớp', group: 'TH' };

const CLASS_LEVELS: EducationLevel[] = Array.from({ length: 12 }, (_, i) => {
  const level = i + 1;
  return {
    id: String(level),
    name: `Lớp ${level}`,
    group: level <= 5 ? 'TH' : level <= 9 ? 'THCS' : 'THPT',
  };
});

const normalizeText = (value?: string): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const SUBJECT_DISPLAY_MAP: Record<string, string> = {
  'toan hoc': 'Toán học',
  toan: 'Toán học',
  'vat ly': 'Vật lý',
  ly: 'Vật lý',
  'hoa hoc': 'Hóa học',
  hoa: 'Hóa học',
  'sinh hoc': 'Sinh học',
  sinh: 'Sinh học',
  'ngu van': 'Ngữ văn',
  van: 'Ngữ văn',
  'tieng anh': 'Tiếng Anh',
  anh: 'Tiếng Anh',
  'lich su': 'Lịch sử',
  'dia ly': 'Địa lý',
  'tin hoc': 'Tin học',
  gdcd: 'Giáo dục công dân',
};

const toTitleCase = (text: string): string =>
  text
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatSubjectLabel = (subject: string): string => {
  const raw = subject.replace(/\s+/g, ' ').trim();
  const key = normalizeText(raw);
  return SUBJECT_DISPLAY_MAP[key] ?? toTitleCase(raw);
};

const buildCardAccent = (subject?: string): string => {
  const normalized = normalizeText(subject);
  if (normalized.includes('toan')) return 'from-[#003466] via-[#1a4b84] to-[#2c6fbe]';
  if (normalized.includes('hoa')) return 'from-[#5b2a00] via-[#8a3f00] to-[#c35f00]';
  if (normalized.includes('ly')) return 'from-[#213a7a] via-[#2b4e9b] to-[#3f66c7]';
  if (normalized.includes('anh')) return 'from-[#0f5f52] via-[#14816f] to-[#21ab93]';
  if (normalized.includes('sinh')) return 'from-[#245500] via-[#2f7600] to-[#409d00]';
  return 'from-[#2f3a46] via-[#3f4d5c] to-[#56677a]';
};

const resolveCardImage = (document: DocumentSummary): string => {
  const fileUrl = document.fileUrl?.trim();
  if (fileUrl && /\.(png|jpe?g|webp|gif)$/i.test(fileUrl)) {
    return fileUrl;
  }

  return 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80';
};

const matchesSelectedLevel = (document: DocumentSummary, selectedLevelId: string): boolean => {
  if (selectedLevelId === ALL_LEVELS.id) {
    return true;
  }

  const text = normalizeText(`${document.className ?? ''} ${document.title ?? ''} ${document.type ?? ''}`);
  const levelRegex = new RegExp(`\\b(lop\\s*)?${selectedLevelId}\\b`);
  return levelRegex.test(text);
};

export default function ExamBankPage() {
  const navigate = useNavigate();

  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | null>(ALL_LEVELS);
  const [selectedSubject, setSelectedSubject] = useState<string>(ALL_SUBJECTS);
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([ALL_LEVELS, ...CLASS_LEVELS]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [keyword, setKeyword] = useState('');
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState('');

  const filteredDocuments = useMemo(() => {
    const selectedLevelId = selectedLevel?.id ?? ALL_LEVELS.id;
    return documents.filter((doc) => matchesSelectedLevel(doc, selectedLevelId));
  }, [documents, selectedLevel?.id]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / DOCUMENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedDocuments = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * DOCUMENTS_PER_PAGE;
    return filteredDocuments.slice(startIndex, startIndex + DOCUMENTS_PER_PAGE);
  }, [filteredDocuments, safeCurrentPage]);

  const loadApprovedDocuments = async (nextKeyword = '', nextSubject = '') => {
    setIsLoadingDocuments(true);
    setDocumentsError('');

    try {
      const result = await userService.getDocuments({
        keyword: nextKeyword.trim() || undefined,
        subject: nextSubject && nextSubject !== ALL_SUBJECTS ? nextSubject : undefined,
        sortBy: 'NEWEST',
        size: 200,
      });

      const mapped = result.map((item) => ({
        ...item,
        subject: item.subject ? formatSubjectLabel(item.subject) : item.subject,
      }));

      setDocuments(mapped);
      setCurrentPage(1);
    } catch (error) {
      console.error('Fetch documents error:', error);
      setDocuments([]);
      setDocumentsError('Không thể tải đề thi từ hệ thống. Vui lòng thử lại.');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subs = await userService.getSubjects();

        const dedupedSubjects = Array.from(
          new Map(
            subs
              .map((subject) => formatSubjectLabel(subject))
              .filter((subject) => normalizeText(subject) !== normalizeText(ALL_SUBJECTS))
              .map((subject) => [normalizeText(subject), subject]),
          ).values(),
        );

        setEducationLevels([ALL_LEVELS, ...CLASS_LEVELS]);
        setSelectedLevel(ALL_LEVELS);
        setSubjects(dedupedSubjects);
        setSelectedSubject(ALL_SUBJECTS);

        await loadApprovedDocuments('', ALL_SUBJECTS);
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="bg-[#003466] rounded-[2rem] p-8 text-white relative overflow-hidden">
        <h1 className="text-3xl font-black mb-2">Thư viện đề thi</h1>
        <p className="text-blue-200/70 text-sm font-medium">Tìm kiếm trong 50,000+ đề thi chất lượng cao</p>
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
                    setCurrentPage(1);
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
              {[ALL_SUBJECTS, ...subjects].map((subject) => (
                <div
                  key={subject}
                  onClick={() => {
                    setSelectedSubject(subject);
                    setIsSubjectOpen(false);
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
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {documentsError}
        </div>
      )}

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Danh sách đề thi</p>
          <p className="text-xs font-bold text-slate-400">{filteredDocuments.length} đề</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pagedDocuments.map((document) => (
            <article
              key={document.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`relative h-28 bg-gradient-to-br ${buildCardAccent(document.subject)} p-3 text-white`}>
                <img
                  src={resolveCardImage(document)}
                  alt={document.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
                <div className="relative flex items-start justify-between gap-3">
                  <span className="rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide backdrop-blur">
                    {document.subject ?? 'Đa môn'}
                  </span>
                  <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-bold backdrop-blur">
                    {document.className ?? 'Tự do'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <h3 className="min-h-[2.5rem] overflow-hidden text-sm font-black leading-tight text-slate-900">{document.title}</h3>

                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <School size={12} /> {document.school ?? 'Cộng đồng'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={12} /> {document.semesterYear ?? 'Chưa cập nhật'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div className="inline-flex items-center gap-1 text-amber-500">
                    <Star size={12} className="fill-current" />
                    <span className="text-xs font-extrabold text-slate-800">{(document.averageRating ?? 0).toFixed(1)}</span>
                    <span className="text-[11px] font-semibold text-slate-400">({document.downloadCount ?? 0})</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/user/comment/${document.id}`)}
                    className="rounded-lg bg-[#003466] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#0b457e]"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!isLoadingDocuments && filteredDocuments.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
            Không tìm thấy đề phù hợp với bộ lọc hiện tại.
          </div>
        )}

        {isLoadingDocuments && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
            Đang tải danh sách đề...
          </div>
        )}

        {!isLoadingDocuments && filteredDocuments.length > 0 && totalPages > 1 && (
          <div className="flex justify-center pt-2">
            <Pagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </section>
    </div>
  );
}
