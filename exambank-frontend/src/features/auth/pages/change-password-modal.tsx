import { CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal/modal";

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initialPasswordForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ChangePasswordModal({
  open,
  onClose,
  title = "Đổi mật khẩu",
  subtitle = "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới của bạn.",
}: ChangePasswordModalProps) {
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(initialPasswordForm);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  function handleClose() {
    setPasswordForm(initialPasswordForm);
    setPasswordError("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  }

  const passwordHasMinLength = passwordForm.newPassword.length >= 8;
  const passwordHasMixedCase = /[a-z]/.test(passwordForm.newPassword) && /[A-Z]/.test(passwordForm.newPassword);
  const passwordHasNumber = /\d/.test(passwordForm.newPassword);
  const passwordHasSpecialChar = /[^A-Za-z0-9]/.test(passwordForm.newPassword);

  function handlePasswordFieldChange(field: keyof PasswordForm, value: string) {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    if (passwordError) {
      setPasswordError("");
    }
  }

  function handleSubmitPasswordChange() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("Vui lòng nhập đầy đủ thông tin mật khẩu.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Mật khẩu mới cần ít nhất 8 ký tự.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="w-[min(420px,88vw)]">
        <p className="text-sm text-[var(--ink-600)]">{subtitle}</p>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--ink-900)]">Mật khẩu hiện tại</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(event) => handlePasswordFieldChange("currentPassword", event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-12 w-full rounded-lg border border-transparent bg-[#d5d7db] px-4 pr-12 text-sm text-[var(--ink-900)] outline-none transition focus:border-[var(--brand-500)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)]"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]"
              >
                {showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--ink-900)]">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(event) => handlePasswordFieldChange("newPassword", event.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-12 w-full rounded-lg border border-transparent bg-[#d5d7db] px-4 pr-12 text-sm text-[var(--ink-900)] outline-none transition focus:border-[var(--brand-500)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)]"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]"
              >
                {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--ink-900)]">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(event) => handlePasswordFieldChange("confirmPassword", event.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-12 w-full rounded-lg border border-transparent bg-[#d5d7db] px-4 pr-12 text-sm text-[var(--ink-900)] outline-none transition focus:border-[var(--brand-500)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280]"
              >
                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {passwordError ? <p className="text-xs font-medium text-rose-600">{passwordError}</p> : null}
          </div>

          <div className="rounded-xl bg-[#e5e7eb] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7280]">Tiêu chí mật khẩu</p>
            <div className="mt-3 space-y-1.5 text-[11px] leading-5">
              <p className={`flex items-center gap-2 whitespace-nowrap ${passwordHasMinLength ? "text-emerald-700" : "text-[#4b5563]"}`}>
                {passwordHasMinLength ? <CheckCircle2 size={13} /> : <Circle size={13} />} Ít nhất 8 ký tự
              </p>
              <p className={`flex items-center gap-2 whitespace-nowrap ${passwordHasMixedCase ? "text-emerald-700" : "text-[#4b5563]"}`}>
                {passwordHasMixedCase ? <CheckCircle2 size={13} /> : <Circle size={13} />} Có chữ hoa và chữ thường
              </p>
              <p className={`flex items-center gap-2 whitespace-nowrap ${passwordHasNumber ? "text-emerald-700" : "text-[#4b5563]"}`}>
                {passwordHasNumber ? <CheckCircle2 size={13} /> : <Circle size={13} />} Có ít nhất một số
              </p>
              <p className={`flex items-center gap-2 whitespace-nowrap ${passwordHasSpecialChar ? "text-emerald-700" : "text-[#4b5563]"}`}>
                {passwordHasSpecialChar ? <CheckCircle2 size={13} /> : <Circle size={13} />} Có ít nhất một ký tự đặc biệt (!@#...)
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmitPasswordChange}
            className="h-12 flex-1 rounded-lg bg-[#0f4584] px-5 text-sm font-bold text-white transition hover:brightness-105"
          >
            Cập nhật mật khẩu
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="h-12 rounded-lg bg-[#d8dbe0] px-8 text-sm font-bold text-[#4b5563] transition hover:bg-[#cfd3d9]"
          >
            Hủy
          </button>
        </div>
      </div>
    </Modal>
  );
}
