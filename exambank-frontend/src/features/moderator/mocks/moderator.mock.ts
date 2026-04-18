import type {
  ComposerQuestion,
  QueueItem,
  ReportItem,
  RubricRow,
} from "@/features/moderator/types/moderator.type";

export const queueSeed: QueueItem[] = [
  {
    id: "Q-2026-041",
    title: "Đề thi Học kì I - Toán 12 - Chuyên Lê Hồng Phong",
    subject: "Toán",
    school: "THPT Chuyên Lê Hồng Phong",
    uploader: "Nguyễn Văn A",
    uploadedAt: "15 phút trước",
    hasReport: true,
    duplicateRisk: "Cao",
    level: "THPT",
    pages: 6,
    fileType: "PDF",
  },
  {
    id: "Q-2026-040",
    title: "Kiểm tra chương Dao động cơ - Vật lý 12",
    subject: "Vật lý",
    school: "THPT Nguyễn Thị Minh Khai",
    uploader: "Trần Thị B",
    uploadedAt: "42 phút trước",
    hasReport: false,
    duplicateRisk: "Vừa",
    level: "THPT",
    pages: 4,
    fileType: "PDF",
  },
  {
    id: "Q-2026-039",
    title: "Đề ôn tập Hóa hữu cơ - Lớp 11",
    subject: "Hóa",
    school: "THPT Gia Định",
    uploader: "Lê Hoàng C",
    uploadedAt: "2 giờ trước",
    hasReport: false,
    duplicateRisk: "Thấp",
    level: "THPT",
    pages: 5,
    fileType: "DOCX",
  },
  {
    id: "Q-2026-038",
    title: "Reading Skills Unit 3 - Tiếng Anh 10",
    subject: "Tiếng Anh",
    school: "THPT Lê Quý Đôn",
    uploader: "Phạm Đăng D",
    uploadedAt: "3 giờ trước",
    hasReport: true,
    duplicateRisk: "Vừa",
    level: "THPT",
    pages: 3,
    fileType: "Ảnh",
  },
];

export const reportQueue: ReportItem[] = [
  {
    id: "R-117",
    reason: "Nghi ngờ trùng lặp với đề đã duyệt tháng trước",
    reporter: "Giáo viên xác minh",
    severity: "Cao",
    relatedExamId: "Q-2026-041",
    createdAt: "09:10",
  },
  {
    id: "R-116",
    reason: "Metadata gắn sai khối lớp",
    reporter: "Moderator nội bộ",
    severity: "Vừa",
    relatedExamId: "Q-2026-040",
    createdAt: "08:58",
  },
  {
    id: "R-115",
    reason: "File mờ, thiếu 2 trang cuối",
    reporter: "Người học",
    severity: "Cao",
    relatedExamId: "Q-2026-038",
    createdAt: "08:33",
  },
];

export const rubricRows: RubricRow[] = [
  { key: "structure", label: "Cấu trúc lập luận", max: 2.0 },
  { key: "accuracy", label: "Độ chính xác kiến thức", max: 3.0 },
  { key: "method", label: "Phương pháp giải", max: 3.0 },
  { key: "presentation", label: "Trình bày và diễn đạt", max: 2.0 },
];

export const composerQuestions: ComposerQuestion[] = [
  {
    id: "C1",
    type: "Trắc nghiệm",
    content: "Cho hàm số bậc ba có đồ thị như hình, số cực trị là bao nhiêu?",
    points: 0.5,
    level: "Nhận biết",
  },
  {
    id: "C2",
    type: "Đúng/Sai",
    content: "Mệnh đề về đạo hàm sau là đúng hay sai?",
    points: 0.5,
    level: "Thông hiểu",
  },
  {
    id: "C3",
    type: "Trắc luận",
    content: "Trình bày lời giải chi tiết cho bài toán tối ưu hóa.",
    points: 2,
    level: "Vận dụng cao",
  },
];

export const editorialTemplate = `# Editorial: Đề Toán 12 - HK1\n\n## Ý tưởng chính\n- Tập trung vào đạo hàm, ứng dụng khảo sát hàm số và bài toán hình học không gian.\n\n## Phân tích nhanh\n- Câu 1-20: mức nhận biết đến thông hiểu.\n- Câu 21-35: mức vận dụng.\n- Câu 36-50: mức vận dụng cao.\n\n## Gợi ý LaTeX\n\n\\[\n\\int_0^1 x^2 \\, dx = \\frac{1}{3}\n\\]\n`;
