import { BookOpen, Languages } from 'lucide-react';
import type {
  UserComment,
  EducationLevel,
  Subject,
  Recommendation,
  Ranking,
  TopicData,
  LeaderboardUser,
  Submission,
  SelectedFile,
  Exam,
} from '../types/user.type';

// Mock data for Comment.tsx
export const mockComments: UserComment[] = [
  {
    id: 1,
    author: "Lê Minh Tâm",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tam",
    rating: 5,
    time: "2 giờ trước",
    content: "Đề thi rất sát với chương trình nâng cao...",
    likes: 24,
  },
  {
    id: 2,
    author: "Hoàng Mỹ Linh",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Linh",
    rating: 4,
    time: "Hôm qua",
    content: "Câu 15 có vẻ hơi gây tranh cãi...",
    likes: 12,
    image: "https://images.unsplash.com/photo-1518131394553-c3fd080004f1?q=80&w=300&auto=format&fit=crop",
  },
  {
    id: 3,
    author: "Nguyễn Văn An",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=An",
    rating: 5,
    time: "3 ngày trước",
    content: "Đề thi rất hay...",
    likes: 8,
  },
];

// Mock data for ExamBankPage.tsx
export const mockEducationLevels: EducationLevel[] = [
  { id: '1', name: "Lớp 1", group: "Tiểu học" },
  { id: '2', name: "Lớp 2", group: "Tiểu học" },
  { id: '3', name: "Lớp 3", group: "Tiểu học" },
  { id: '4', name: "Lớp 4", group: "Tiểu học" },
  { id: '5', name: "Lớp 5", group: "Tiểu học" },
  { id: '6', name: "Lớp 6", group: "THCS" },
  { id: '7', name: "Lớp 7", group: "THCS" },
  { id: '8', name: "Lớp 8", group: "THCS" },
  { id: '9', name: "Lớp 9", group: "THCS" },
  { id: '10', name: "Lớp 10", group: "THPT" },
  { id: '11', name: "Lớp 11", group: "THPT" },
  { id: '12', name: "Lớp 12", group: "THPT" },
  { id: 'uni', name: "Sinh viên Đại học", group: "Đại học" },
];

export const mockSubjects: Subject[] = [
  "Tất cả môn học",
  "Toán học",
  "Ngữ văn",
  "Tiếng Anh",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Lịch sử",
  "Địa lý",
  "Kinh tế",
];

// Mock data for UserHomePage.tsx
export const mockRecommendations: Recommendation[] = [
  {
    title: "Chuyên đề Hàm số & Đạo hàm",
    description: "Phân tích cho thấy bạn thường sai...",
    icon: BookOpen as any,
    tag: "Cần cải thiện",
    color: "error",
    stats: "30 câu • 45 phút",
  },
  {
    title: "Đọc hiểu Tiếng Anh IELTS 6.5+",
    description: "Tăng cường vốn từ vựng học thuật...",
    icon: Languages as any,
    tag: "Đề nghị học tập",
    color: "primary",
    stats: "20 câu • 30 phút",
  },
  {
    title: "Lý thuyết Hóa học hữu cơ",
    description: "Cần ôn tập thêm...",
    icon: BookOpen as any,
    tag: "Khuyến nghị",
    color: "secondary",
    stats: "25 câu • 40 phút",
  },
];

export const mockRankings: Ranking[] = [
  { rank: 1, name: "Nguyễn Anh Tuấn", score: "985/1200", avatar: "1" },
  { rank: 2, name: "Trần Thùy Chi", score: "972/1200", avatar: "2" },
  { rank: 3, name: "Lê Minh Đức", score: "965/1200", avatar: "3" },
  { rank: 4, name: "Phạm Thị Lan", score: "958/1200", avatar: "4" },
  { rank: 5, name: "Hoàng Văn Bình", score: "945/1200", avatar: "5" },
];

// Mock data for Examreview.tsx
export const mockTopics: TopicData[] = [
  { name: "Ma Trận & Hệ Phương Trình", percentage: 100, color: "bg-emerald-500" },
  { name: "Không Gian Vector", percentage: 85, color: "bg-emerald-500" },
  { name: "Giá Trị Riêng & Vector Riêng", percentage: 60, color: "bg-amber-500" },
  { name: "Định thức Ma trận", percentage: 90, color: "bg-emerald-500" },
  { name: "Ma trận Nghịch đảo", percentage: 75, color: "bg-blue-500" },
];

export const mockLeaderboard: LeaderboardUser[] = [
  { rank: 1, name: "Minh Anh", score: 10.0, isUser: false },
  { rank: 2, name: "Hoàng Nam", score: 9.8, isUser: false },
  { rank: 3, name: "Lan Vy", score: 9.7, isUser: false },
  { rank: 4, name: "Bạn (Thắng)", score: 9.5, isUser: true },
  { rank: 5, name: "Quang Huy", score: 9.3, isUser: false },
];

// Mock data for Mysubmit.tsx
export const mockSubmissions: Submission[] = [
  {
    id: 1,
    title: "Advanced Macroeconomics Final",
    university: "LSE",
    year: "2023",
    subject: "Economics",
    type: "Final Exam",
    status: "Approved",
    date: "Oct 12, 2024",
  },
  {
    id: 2,
    title: "Introduction to Neural Networks",
    university: "MIT",
    year: "2024",
    subject: "Computer Science",
    type: "Midterm",
    status: "Pending",
    date: "Yesterday",
  },
  {
    id: 3,
    title: "Organic Chemistry II Lab",
    university: "Oxford",
    year: "2022",
    subject: "Chemistry",
    type: "Lab Report",
    status: "Rejected",
    reason: "Poor scan quality",
    date: "Sep 28, 2024",
  },
  {
    id: 4,
    title: "Civil Law Fundamentals",
    university: "Sorbonne",
    year: "2023",
    subject: "Law",
    type: "Mock Exam",
    status: "Approved",
    date: "Aug 15, 2024",
  },
  {
    id: 5,
    title: "Calculus I Final Exam",
    university: "Harvard",
    year: "2024",
    subject: "Mathematics",
    type: "Final Exam",
    status: "Approved",
    date: "Jul 20, 2024",
  },
];

// Mock data for SubmitExamPage.tsx
export const mockSelectedFile: SelectedFile = {
  name: "math_final_assessment_v2.pdf",
  size: "1.2 MB",
};


// Mock data đề thi
// src/features/exam/mockExam.ts



export const mockExam: Exam = {
  id: "exam_001",
  title: "Đề thi React cơ bản",
  description: "Kiểm tra kiến thức React và JavaScript",
  duration: 30,
  createdAt: "2026-04-05",
  questions: [
    {
      id: "q1",
      type: "multiple_choice",
      question: "React là gì?",
      options: [
        "Thư viện JavaScript",
        "Ngôn ngữ lập trình",
        "Hệ điều hành",
        "Database"
      ],
      correctAnswer: 0,
      score: 1
    },
    {
      id: "q2",
      type: "true_false",
      question: "useState là hook trong React",
      correctAnswer: true,
      score: 1
    },
    {
      id: "q3",
      type: "fill_blank",
      question: "Hook dùng để quản lý state là ______",
      correctAnswer: "useState",
      score: 2
    }
  ]
};