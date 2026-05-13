import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole, Plus } from "lucide-react";
import { extractApiErrorMessage } from "@/lib/error-utils";
import { premiumCompetitionService } from "@/features/user/services/premium-competition.service";
import type { PremiumCompetition } from "@/features/user/types/premium-competition.type";

export default function PremiumCompetitionsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PremiumCompetition[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setItems(await premiumCompetitionService.listMine());
      setError("");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể tải danh sách cuộc thi."));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const closeCompetition = async (id: number) => {
    try {
      await premiumCompetitionService.closeCompetition(id);
      await load();
    } catch (err) {
      setError(extractApiErrorMessage(err, "Không thể đóng cuộc thi."));
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cuộc thi private của tôi</h1>
            <p className="text-sm text-slate-500">Quản lý mã truy cập và đề thi premium đã tạo.</p>
          </div>
          <button type="button" onClick={() => navigate("/user/premium/import")} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            <Plus size={16} /> Tạo từ file
          </button>
        </div>
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      <section className="grid gap-4">
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Bạn chưa có cuộc thi private nào.
          </div>
        )}
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  <LockKeyhole size={14} /> {item.status}
                </div>
                <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                <p className="text-sm text-slate-500">Đề #{item.examId} - {item.examTitle}</p>
              </div>
              <div className="grid gap-2 text-sm md:min-w-64">
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  Mã truy cập: <span className="font-mono font-bold text-slate-900">{item.accessCode}</span>
                </div>
                <button type="button" onClick={() => navigate(`/user/exam/${item.examId}`)} className="rounded-md bg-slate-900 px-3 py-2 font-semibold text-white">
                  Mở đề
                </button>
                {item.status !== "CLOSED" && (
                  <button type="button" onClick={() => closeCompetition(item.id)} className="rounded-md border border-red-200 px-3 py-2 font-semibold text-red-600">
                    Đóng cuộc thi
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
