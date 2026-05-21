import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { extractApiErrorMessage } from "@/lib/error-utils";
import { premiumCompetitionService } from "@/features/user/services/premium-competition.service";

export default function PrivateCompetitionJoinPage() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const unlock = async () => {
    setIsBusy(true);
    setError("");
    try {
      const result = await premiumCompetitionService.unlockCompetition(accessCode, password);
      navigate(`/user/exam/${result.examId}`);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Mã cuộc thi hoặc mật khẩu không đúng."));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center p-6">
      <section className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-md bg-blue-50 p-3 text-blue-600">
            <LockKeyhole size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vào cuộc thi private</h1>
            <p className="text-sm text-slate-500">Bạn cần đăng nhập, nhập đúng mã và mật khẩu để làm bài.</p>
          </div>
        </div>
        <div className="grid gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Mã cuộc thi
            <input className="rounded-md border border-slate-300 px-3 py-2 uppercase" value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Mật khẩu
            <input className="rounded-md border border-slate-300 px-3 py-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="button" onClick={unlock} disabled={isBusy} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            {isBusy ? "Đang kiểm tra..." : "Vào làm bài"}
          </button>
        </div>
      </section>
    </main>
  );
}
