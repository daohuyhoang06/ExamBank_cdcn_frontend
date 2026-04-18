export type QueueItem = {
  id: string;
  title: string;
  subject: string;
  school: string;
  uploader: string;
  uploadedAt: string;
  hasReport: boolean;
  duplicateRisk: "Thấp" | "Vừa" | "Cao";
  level: "THCS" | "THPT";
  pages: number;
  fileType: "PDF" | "DOCX" | "Ảnh";
};

export type ReportItem = {
  id: string;
  reason: string;
  reporter: string;
  severity: "Thấp" | "Vừa" | "Cao";
  relatedExamId: string;
  createdAt: string;
};

export type RubricRow = {
  key: string;
  label: string;
  max: number;
};

export type ComposerQuestion = {
  id: string;
  type: "Trắc nghiệm" | "Đúng/Sai" | "Trắc luận";
  content: string;
  points: number;
  level: "Nhận biết" | "Thông hiểu" | "Vận dụng" | "Vận dụng cao";
};
