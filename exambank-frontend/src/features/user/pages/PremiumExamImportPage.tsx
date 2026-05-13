import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUp, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { extractApiErrorMessage } from "@/lib/error-utils";
import { parseDraftJson, premiumCompetitionService } from "@/features/user/services/premium-competition.service";
import type { ExamDraft, ExamDraftQuestion, ExamImportJob, SubjectOption } from "@/features/user/types/premium-competition.type";

const emptyQuestion = (orderIndex: number): ExamDraftQuestion => ({
  content: "",
  type: "MCQ",
  options: ["", "", "", ""],
  answer: "A",
  answerExplanation: "",
  difficulty: 1,
  maxScore: 1,
  orderIndex,
  needsReview: true,
});

const generateAccessCode = () => `EXAM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export default function PremiumExamImportPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [className, setClassName] = useState("Lớp 12");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [job, setJob] = useState<ExamImportJob | null>(null);
  const [draft, setDraft] = useState<ExamDraft | null>(null);
  const [accessCode, setAccessCode] = useState(generateAccessCode());
  const [competitionPassword, setCompetitionPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    premiumCompetitionService.listSubjects()
      .then((items) => {
        setSubjects(items);
        if (items.length > 0) {
          setSubjectId(items[0].id);
        }
      })
      .catch(() => setSubjects([]));
  }, []);

  const reviewCount = useMemo(() => draft?.questions.filter((question) => question.needsReview).length ?? 0, [draft]);

  const upload = async () => {
    if (!file || !title.trim() || subjectId === "") {
      setError("Vui lòng nhập tên đề, chọn môn học và chọn file.");
      return;
    }
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const uploaded = await premiumCompetitionService.uploadExamImport({
        file,
        title,
        subjectId,
        className,
        durationMinutes,
      });
      setJob(uploaded);
      const parsedDraft = parseDraftJson(uploaded.draftJson);
      if (!parsedDraft) {
        throw new Error(uploaded.errorMessage || "Không thể tạo bản nháp từ file này.");
      }
      setDraft(parsedDraft);
      setMessage("Đã trích xuất xong. Hãy rà soát câu hỏi trước khi tạo cuộc thi.");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể import đề thi. Kiểm tra gói premium, định dạng file hoặc cấu hình Docling."));
    } finally {
      setIsBusy(false);
    }
  };

  const updateQuestion = (index: number, patch: Partial<ExamDraftQuestion>) => {
    setDraft((current) => {
      if (!current) return current;
      const questions = current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch, needsReview: false } : question,
      );
      return { ...current, questions };
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setDraft((current) => {
      if (!current) return current;
      const questions = current.questions.map((question, index) => {
        if (index !== questionIndex) return question;
        const options = [...question.options];
        options[optionIndex] = value;
        return { ...question, options, needsReview: false };
      });
      return { ...current, questions };
    });
  };

  const addQuestion = () => {
    setDraft((current) => {
      if (!current) return current;
      return { ...current, questions: [...current.questions, emptyQuestion(current.questions.length + 1)] };
    });
  };

  const removeQuestion = (index: number) => {
    setDraft((current) => {
      if (!current) return current;
      return { ...current, questions: current.questions.filter((_, questionIndex) => questionIndex !== index) };
    });
  };

  const createCompetition = async () => {
    if (!job || !draft) return;
    if (!competitionPassword || competitionPassword.length < 6) {
      setError("Mật khẩu cuộc thi phải có ít nhất 6 ký tự.");
      return;
    }
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const confirmed = await premiumCompetitionService.confirmImport(job.id, draft);
      if (!confirmed.createdExamId) {
        throw new Error("Backend chưa trả về mã đề đã tạo.");
      }
      await premiumCompetitionService.createCompetition({
        examId: confirmed.createdExamId,
        title: draft.title,
        accessCode,
        password: competitionPassword,
        maxAttemptsPerUser: 1,
      });
      setMessage(`Đã tạo cuộc thi private với mã ${accessCode}.`);
      navigate("/user/premium/competitions");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể tạo cuộc thi private từ bản nháp này."));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Import đề bằng AI</h1>
            <p className="text-sm text-slate-500">Premium: upload PDF, DOCX, HTML hoặc ảnh để tạo đề private.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/user/premium/competitions")}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <LockKeyhole size={16} /> Cuộc thi của tôi
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Tên đề
            <input className="rounded-md border border-slate-300 px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Môn học
            <select className="rounded-md border border-slate-300 px-3 py-2" value={subjectId} onChange={(event) => setSubjectId(Number(event.target.value))}>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Lớp
            <input className="rounded-md border border-slate-300 px-3 py-2" value={className} onChange={(event) => setClassName(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Thời lượng phút
            <input className="rounded-md border border-slate-300 px-3 py-2" type="number" min={1} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-md border border-dashed border-slate-300 p-4 sm:flex-row sm:items-center sm:justify-between">
          <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <button type="button" onClick={upload} disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <FileUp size={16} /> {isBusy ? "Đang xử lý..." : "Upload và trích xuất"}
          </button>
        </div>
        {message && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      {draft && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bản nháp câu hỏi</h2>
              <p className="text-sm text-slate-500">{draft.questions.length} câu, {reviewCount} câu cần rà soát.</p>
            </div>
            <button type="button" onClick={addQuestion} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">
              <Plus size={16} /> Thêm câu
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {draft.questions.map((question, index) => (
              <article key={index} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-700">Câu {index + 1}</span>
                  <button type="button" onClick={() => removeQuestion(index)} className="rounded-md p-2 text-red-600 hover:bg-red-50" aria-label="Xóa câu">
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={question.content} onChange={(event) => updateQuestion(index, { content: event.target.value })} />
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={question.type} onChange={(event) => updateQuestion(index, { type: event.target.value as ExamDraftQuestion["type"] })}>
                    <option value="MCQ">Trắc nghiệm</option>
                    <option value="FILL_IN_BLANK">Điền đáp án</option>
                    <option value="TRUE_FALSE">Đúng/Sai</option>
                  </select>
                  <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={question.answer} onChange={(event) => updateQuestion(index, { answer: event.target.value })} placeholder="Đáp án" />
                  <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min={0.25} step={0.25} value={question.maxScore ?? 1} onChange={(event) => updateQuestion(index, { maxScore: Number(event.target.value) })} />
                </div>
                {question.type === "MCQ" && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {question.options.map((option, optionIndex) => (
                      <input key={optionIndex} className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={option} onChange={(event) => updateOption(index, optionIndex, event.target.value)} placeholder={`${String.fromCharCode(65 + optionIndex)}.`} />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Mã cuộc thi
              <input className="rounded-md border border-slate-300 px-3 py-2 uppercase" value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Mật khẩu
              <input className="rounded-md border border-slate-300 px-3 py-2" type="password" value={competitionPassword} onChange={(event) => setCompetitionPassword(event.target.value)} />
            </label>
            <button type="button" onClick={createCompetition} disabled={isBusy} className="mt-auto rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
              Tạo đề và cuộc thi private
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
