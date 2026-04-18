import { type ChangeEvent, type RefObject } from "react";
import { RefreshCcw, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal/modal";

type ComposerJsonImportModalProps = {
  open: boolean;
  isImporting: boolean;
  jsonImportText: string;
  jsonImportUiError: string;
  jsonImportInputRef: RefObject<HTMLInputElement | null>;
  exampleValueText: string;
  onClose: () => void;
  onOpenFilePicker: () => void;
  onFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  onJsonImportTextChange: (nextValue: string) => void;
  onSubmit: () => void;
};

export function ComposerJsonImportModal({
  open,
  isImporting,
  jsonImportText,
  jsonImportUiError,
  jsonImportInputRef,
  exampleValueText,
  onClose,
  onOpenFilePicker,
  onFileSelected,
  onJsonImportTextChange,
  onSubmit,
}: ComposerJsonImportModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nhập đề thi từ JSON"
      titleClassName="text-[1.375rem]"
      description="Dán JSON hoặc tải file .json để tạo nhanh một hoặc nhiều đề thi."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-lg bg-[var(--brand-600)] px-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onOpenFilePicker}
            disabled={isImporting}
          >
            Tải file .json
          </button>
          <input
            ref={jsonImportInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onFileSelected}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          <label className="space-y-1 md:col-span-7">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-500)]">JSON import</span>
            <textarea
              className="h-[24rem] w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-soft)] p-3 font-mono text-xs text-[var(--ink-800)] outline-none transition focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_rgba(31,99,180,0.12)]"
              value={jsonImportText}
              onChange={(event) => onJsonImportTextChange(event.target.value)}
              placeholder="Dán JSON vào đây..."
              disabled={isImporting}
            />
          </label>

          <div className="space-y-1 md:col-span-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-400)]">Example Value</span>
            <pre className="h-[24rem] overflow-auto rounded-xl border border-dashed border-[var(--line-soft)] bg-white p-3 font-mono text-xs leading-relaxed text-[var(--ink-600)]">
              {exampleValueText}
            </pre>
          </div>
        </div>

        {jsonImportUiError ? (
          <p className="whitespace-pre-line rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {jsonImportUiError}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-lg border border-[var(--line-soft)] bg-white px-4 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-soft)]"
            onClick={onClose}
            disabled={isImporting}
          >
            Đóng
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onSubmit}
            disabled={isImporting}
          >
            {isImporting ? <RefreshCcw size={14} className="animate-spin" /> : <Upload size={14} />} {isImporting ? "Đang import..." : "Import JSON"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
