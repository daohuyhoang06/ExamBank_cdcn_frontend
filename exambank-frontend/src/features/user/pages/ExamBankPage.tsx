import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  Star,
  Check,
  ArrowRight,
  School,
  BookMarked
} from 'lucide-react';

import type { EducationLevel, ExamListItem, Subject } from '../types/user.type';
import { userService } from '../services/user.service';
import { examService } from '../services/user.service';

export default function ExamBankPage() {
  const navigate = useNavigate();
  // State
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [keyword, setKeyword] = useState('');
  const [allExams, setAllExams] = useState<ExamListItem[]>([]);
  const [filteredExams, setFilteredExams] = useState<ExamListItem[]>([]);

  // Fetch data từ service
  useEffect(() => {
    const fetchData = async () => {
      try {
        const levels = await userService.getEducationLevels();
        const subs = await userService.getSubjects();
        const exams = await examService.getAllExams();

        setEducationLevels(levels);
        setSubjects(subs);
        setAllExams(exams);
        setFilteredExams(exams);

        // set default
        if (levels.length > 0) setSelectedLevel(levels[0]);
        if (subs.length > 0) setSelectedSubject(subs[0]);
      } catch (error) {
        console.error('Fetch error:', error);
      }
    };

    fetchData();
  }, []);

  const applyFilters = (nextKeyword = keyword, nextSubject = selectedSubject) => {
    const normalizedKeyword = nextKeyword.trim().toLowerCase();
    const normalizedSubject = nextSubject.trim().toLowerCase();
    const hasSubjectFilter = nextSubject && nextSubject !== 'Tất cả môn học';

    const next = allExams.filter((exam) => {
      const matchesKeyword =
        !normalizedKeyword || exam.title.toLowerCase().includes(normalizedKeyword);

      const examSubject = (exam.subjectName ?? '').toLowerCase();

      const matchesSubject =
        !hasSubjectFilter ||
        examSubject.includes(normalizedSubject) ||
        exam.title.toLowerCase().includes(normalizedSubject);

      return matchesKeyword && matchesSubject;
    });

    setFilteredExams(next);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">

      {/* Hero */}
      <div className="bg-[#003466] rounded-[2rem] p-8 text-white relative overflow-hidden">
        <h1 className="text-3xl font-black mb-2">Thư viện đề thi</h1>
        <p className="text-blue-200/70 text-sm font-medium">
          Tìm kiếm trong 50,000+ đề thi chất lượng cao
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 relative z-50">

        {/* Search */}
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tên đề thi..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 font-bold"
          />
        </div>

        {/* Level */}
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
              <span className="font-bold text-sm">
                {selectedLevel?.name || 'Chọn lớp'}
              </span>
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

        {/* Subject */}
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
              <span className="font-bold text-sm">
                {selectedSubject || 'Chọn môn'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 ${isSubjectOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSubjectOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg z-50">
              {subjects.map((sub) => (
                <div
                  key={sub}
                  onClick={() => {
                    setSelectedSubject(sub);
                    setIsSubjectOpen(false);
                    applyFilters(keyword, sub);
                  }}
                  className="px-4 py-3 hover:bg-indigo-50 cursor-pointer flex justify-between"
                >
                  <span>{sub}</span>
                  {selectedSubject === sub && <Check />}
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => applyFilters()} className="px-6 py-3 bg-blue-600 text-white rounded-2xl">
          Lọc
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExams.map((exam) => (
          <div key={exam.id} className="bg-white p-3 rounded-2xl border">
            <img
              src="https://images.unsplash.com/photo-1606326666490-45757474e788"
              alt={exam.title}
              className="rounded-xl mb-3"
            />

            <h3 className="font-bold text-sm mb-2">
              {exam.title}
            </h3>

            <p className="text-xs text-slate-400 mb-3">
              {exam.subjectName ?? selectedSubject ?? 'Đa môn'} • {exam.durationMinutes ?? 30} phút
            </p>

            <div className="flex justify-between">
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="w-4 h-4 fill-current" />
                <span>4.{(exam.id % 4) + 5}</span>
              </div>

              <button
                onClick={() => navigate(`/user/exam/${exam.id}`)}
                className="text-blue-600 flex items-center gap-1"
              >
                Làm ngay <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredExams.length === 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-500">
          Không tìm thấy đề phù hợp bộ lọc hiện tại.
        </div>
      )}
    </div>
  );
} 