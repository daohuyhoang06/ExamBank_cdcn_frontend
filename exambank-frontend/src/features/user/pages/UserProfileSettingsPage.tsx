import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Camera,
  Globe2,
  Lock,
  Save,
  Shield,
  UserCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService, syncStoredAuthUser } from "@/features/auth/services/auth.service";
import { userService } from "../services/user.service";
import type { UserProfile } from "../types/user.type";

type NoticeType = "success" | "error" | "info";

type UiPreferences = {
  bio: string;
  language: string;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifyMentor: boolean;
  profileVisibility: "public" | "private";
  avatarUrl: string;
};

type PasswordForm = {
  currentPassword: string;
  nextPassword: string;
  confirmPassword: string;
};

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/notionists/svg?seed=scholarly-user";

const extractErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Đã xảy ra lỗi không xác định.";
};

const buildDefaultPreferences = (): UiPreferences => ({
  bio: "",
  language: "vi-VN",
  notifyEmail: true,
  notifyPush: true,
  notifyMentor: false,
  profileVisibility: "public",
  avatarUrl: DEFAULT_AVATAR,
});

const readStoredPreferences = (profile: UserProfile): UiPreferences => {
  if (typeof window === "undefined") {
    return buildDefaultPreferences();
  }

  const key = `user-profile-ui:${profile.id}`;
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return buildDefaultPreferences();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      ...buildDefaultPreferences(),
      ...parsed,
      avatarUrl: parsed.avatarUrl?.trim() || DEFAULT_AVATAR,
      profileVisibility: parsed.profileVisibility === "private" ? "private" : "public",
    };
  } catch {
    return buildDefaultPreferences();
  }
};

const formatProfileDate = (isoDate?: string): string => {
  if (!isoDate) {
    return "Chưa có dữ liệu";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Chưa có dữ liệu";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export default function UserProfileSettingsPage() {
  const navigate = useNavigate();

  const normalizeText = (value: string): string => value.trim();
  const normalizeEmail = (value: string): string => value.trim().toLowerCase();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savedName, setSavedName] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [preferences, setPreferences] = useState<UiPreferences>({
    bio: "",
    language: "vi-VN",
    notifyEmail: true,
    notifyPush: true,
    notifyMentor: false,
    profileVisibility: "public",
    avatarUrl: DEFAULT_AVATAR,
  });
  const [savedPreferences, setSavedPreferences] = useState<UiPreferences>({
    bio: "",
    language: "vi-VN",
    notifyEmail: true,
    notifyPush: true,
    notifyMentor: false,
    profileVisibility: "public",
    avatarUrl: DEFAULT_AVATAR,
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });

  const [notice, setNotice] = useState<{ type: NoticeType; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  const profileStorageKey = useMemo(
    () => (profile ? `user-profile-ui:${profile.id}` : null),
    [profile],
  );

  const hydrateFromProfile = (nextProfile: UserProfile): void => {
    const stored = readStoredPreferences(nextProfile);
    setProfile(nextProfile);
    setName(nextProfile.name);
    setEmail(nextProfile.email);
    setPreferences(stored);
    setSavedName(nextProfile.name);
    setSavedEmail(nextProfile.email);
    setSavedPreferences(stored);
  };

  const hasProfileChanges = useMemo(
    () =>
      normalizeText(name) !== normalizeText(savedName) ||
      normalizeEmail(email) !== normalizeEmail(savedEmail),
    [email, name, savedEmail, savedName],
  );

  const hasBackendProfileChanges = useMemo(
    () => normalizeText(name) !== normalizeText(savedName) || normalizeEmail(email) !== normalizeEmail(savedEmail),
    [email, name, savedEmail, savedName],
  );

  const hasPreferenceChanges = useMemo(
    () => JSON.stringify(preferences) !== JSON.stringify(savedPreferences),
    [preferences, savedPreferences],
  );

  const persistPreferences = (nextPreferences: UiPreferences = preferences): void => {
    if (typeof window === "undefined" || !profileStorageKey) {
      return;
    }

    window.localStorage.setItem(profileStorageKey, JSON.stringify(nextPreferences));
  };

  const fetchProfile = useCallback(async (): Promise<void> => {
    setLoading(true);
    setNotice(null);

    try {
      const data = await userService.getMyProfile();
      hydrateFromProfile(data);
    } catch (error) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object"
          ? ((error as { response?: { status?: number } }).response?.status ?? 0)
          : 0;

      if (status === 401 || status === 403) {
        authService.logout();
        navigate("/login", {
          replace: true,
          state: { from: "/user/profile" },
        });
        return;
      }

      setNotice({ type: "error", message: extractErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const saveProfileToBackend = async (): Promise<UserProfile> => {
    if (!profile) {
      throw new Error("Không tìm thấy thông tin người dùng hiện tại.");
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      throw new Error("Họ tên không được để trống.");
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      throw new Error("Email không hợp lệ.");
    }

    return userService.updateMyProfile({
      name: trimmedName,
      email: trimmedEmail,
    });
  };

  const handleSaveProfile = async (): Promise<void> => {
    setSavingProfile(true);
    setNotice(null);

    try {
      const updated = hasBackendProfileChanges ? await saveProfileToBackend() : profile;
      if (!updated) {
        throw new Error("Không tìm thấy thông tin người dùng hiện tại.");
      }

      setProfile(updated);
      setName(updated.name);
      setEmail(updated.email);
      setSavedName(updated.name);
      setSavedEmail(updated.email);
      setSavedPreferences(preferences);

      syncStoredAuthUser({
        fullName: updated.name,
        name: updated.name,
        email: updated.email,
      });

      persistPreferences(preferences);
      setNotice({ type: "success", message: "Đã cập nhật thông tin cá nhân thành công." });
    } catch (error) {
      setNotice({ type: "error", message: extractErrorMessage(error) });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (): Promise<void> => {
    setSavingPassword(true);
    setNotice(null);

    try {
      if (!passwordForm.currentPassword.trim()) {
        throw new Error("Vui lòng nhập mật khẩu hiện tại.");
      }
      if (passwordForm.nextPassword.trim().length < 8) {
        throw new Error("Mật khẩu mới cần tối thiểu 8 ký tự.");
      }
      if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
        throw new Error("Mật khẩu xác nhận không trùng khớp.");
      }

      await userService.updateMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.nextPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
      setNotice({ type: "success", message: "Đã cập nhật mật khẩu thành công." });
    } catch (error) {
      setNotice({ type: "error", message: extractErrorMessage(error) });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveAll = async (): Promise<void> => {
    setSavingAll(true);
    setNotice(null);

    try {
      const updated = hasBackendProfileChanges ? await saveProfileToBackend() : profile;
      if (!updated) {
        throw new Error("Không tìm thấy thông tin người dùng hiện tại.");
      }

      setProfile(updated);
      setName(updated.name);
      setEmail(updated.email);
      setSavedName(updated.name);
      setSavedEmail(updated.email);
      setSavedPreferences(preferences);

      syncStoredAuthUser({
        fullName: updated.name,
        name: updated.name,
        email: updated.email,
      });

      persistPreferences(preferences);
      setNotice({
        type: "info",
        message:
          "Đã lưu hồ sơ thành công. Thông tin cá nhân được lưu vào backend, các tùy chọn giao diện được lưu trên trình duyệt.",
      });
    } catch (error) {
      setNotice({ type: "error", message: extractErrorMessage(error) });
    } finally {
      setSavingAll(false);
    }
  };

  const handleDeactivateAccount = async (): Promise<void> => {
    if (!profile) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Bạn có chắc chắn muốn vô hiệu hóa tài khoản?");
      if (!confirmed) {
        return;
      }
    }

    setChangingStatus(true);
    setNotice(null);

    try {
      const updated = await userService.updateMyStatus("INACTIVE");
      setProfile(updated);
      setName(updated.name);
      setEmail(updated.email);
      setNotice({ type: "success", message: "Tài khoản đã được chuyển sang trạng thái INACTIVE." });
    } catch (error) {
      setNotice({ type: "error", message: extractErrorMessage(error) });
    } finally {
      setChangingStatus(false);
    }
  };

  const handleReset = (): void => {
    if (!profile) {
      return;
    }

    const stored = readStoredPreferences(profile);
    setName(profile.name);
    setEmail(profile.email);
    setPreferences(stored);
    setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
    setNotice(null);
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setNotice({ type: "error", message: "Kích thước ảnh vượt quá 2MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setNotice({ type: "error", message: "Không thể đọc tệp ảnh đã chọn." });
        return;
      }

      setPreferences((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      setNotice({ type: "info", message: "Ảnh đại diện đã đổi. Nhấn Lưu để áp dụng." });
    };
    reader.onerror = () => {
      setNotice({ type: "error", message: "Không thể đọc tệp ảnh đã chọn." });
    };
    reader.readAsDataURL(file);

    event.target.value = "";
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--line-soft)] bg-white p-8 text-center text-[var(--ink-600)]">
        Đang tải dữ liệu hồ sơ...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        Không thể tải dữ liệu hồ sơ. Vui lòng đăng nhập lại để dùng API /api/v1/users/me.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-[28px] border border-[#c8d9ff] bg-[linear-gradient(140deg,#0c3a72_0%,#0f4d96_42%,#136f84_100%)] p-6 text-white shadow-[0_18px_40px_rgba(15,77,150,0.32)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="inline-flex w-fit items-center rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold tracking-[0.12em]">
              HỒ SƠ NGƯỜI DÙNG
            </p>
            <h1 className="text-3xl font-black leading-tight sm:text-[2.2rem]">Quản lý tài khoản cá nhân</h1>
            <p className="max-w-2xl text-sm leading-6 text-blue-100 sm:text-[0.95rem]">
              Cập nhật thông tin của bạn, tăng cường bảo mật và cá nhân hóa trải nghiệm học tập trên ExamBank.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-md">
              <p className="text-blue-100/90">Vai trò</p>
              <p className="mt-1 font-bold text-white">{profile.roles.join(", ")}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-md">
              <p className="text-blue-100/90">Ngày tham gia</p>
              <p className="mt-1 font-bold text-white">{formatProfileDate(profile.createdAt)}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-md">
              <p className="text-blue-100/90">Điểm XP</p>
              <p className="mt-1 font-bold text-white">{profile.xp}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-md">
              <p className="text-blue-100/90">Chuỗi học tập</p>
              <p className="mt-1 font-bold text-white">{profile.streak} ngày</p>
            </div>
          </div>
        </div>
      </header>

      {notice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : notice.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-[var(--line-soft)] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-extrabold text-[var(--brand-700)]">
            <UserCircle2 size={20} />
            Thông tin cá nhân
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-semibold text-[var(--ink-700)]">Họ và tên</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
                />
              </label>
            </div>

            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-[var(--ink-700)]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-[var(--ink-700)]">Tiểu sử</span>
              <textarea
                rows={4}
                value={preferences.bio}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, bio: event.target.value }))
                }
                className="w-full resize-none rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
                placeholder="Ví dụ: Mình đang luyện thi THPT Quốc gia và thích môn Toán, Lý."
              />
            </label>

            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-700">
              Họ tên và email sẽ được lưu trực tiếp vào backend qua API /api/v1/users/me. Các tùy chọn giao diện như tiểu sử, ngôn ngữ sẽ được lưu trên trình duyệt.
            </div>

            <button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={savingProfile || !hasProfileChanges}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={15} />
              {savingProfile ? "Đang lưu..." : "Lưu thông tin cá nhân"}
            </button>
          </div>
        </div>

        <aside className="rounded-3xl border border-[var(--line-soft)] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="text-center">
            <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-xl ring-2 ring-[var(--brand-100)]">
              <img src={preferences.avatarUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => avatarFileInputRef.current?.click()}
                className="absolute bottom-0 right-0 rounded-full bg-[var(--brand-700)] p-2 text-white shadow-lg"
                title="Đổi ảnh"
              >
                <Camera size={14} />
              </button>
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            <p className="mt-4 text-base font-bold text-[var(--ink-900)]">{name || "Người dùng"}</p>
            <p className="mt-1 text-xs text-[var(--ink-500)]">JPG, GIF hoặc PNG. Tối đa 2MB.</p>
          </div>

          <div className="mt-6 space-y-2 rounded-2xl border border-[var(--line-soft)] bg-[var(--bg-page)] p-4 text-sm">
            <p className="font-bold text-[var(--ink-900)]">Thông tin hệ thống</p>
            <p className="text-[var(--ink-700)]">Mã người dùng: #{profile.id}</p>
            <p className="text-[var(--ink-700)]">Vai trò: {profile.roles.join(", ")}</p>
            <p className="text-[var(--ink-700)]">Trạng thái: {profile.status}</p>
            <p className="text-[var(--ink-700)]">Số dư coin: {profile.coinBalance}</p>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--line-soft)] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-extrabold text-[var(--brand-700)]">
            <Lock size={20} />
            Bảo mật tài khoản
          </h2>

          <div className="space-y-4">
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[var(--ink-700)]">Mật khẩu hiện tại</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[var(--ink-700)]">Mật khẩu mới</span>
              <input
                type="password"
                value={passwordForm.nextPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, nextPassword: event.target.value }))
                }
                className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[var(--ink-700)]">Xác nhận mật khẩu mới</span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleSavePassword()}
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Shield size={15} />
              {savingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--line-soft)] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-extrabold text-[var(--brand-700)]">
            <BellRing size={20} />
            Tùy chọn hiển thị
          </h2>

          <div className="space-y-4">
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[var(--ink-700)]">Ngôn ngữ hệ thống</span>
              <select
                value={preferences.language}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, language: event.target.value }))
                }
                className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
              >
                <option value="vi-VN">Tiếng Việt</option>
                <option value="en-US">English (US)</option>
                <option value="ja-JP">日本語 (Japanese)</option>
              </select>
            </label>

            <label className="flex items-center justify-between rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 text-sm">
              <span>Thông báo qua email</span>
              <input
                type="checkbox"
                checked={preferences.notifyEmail}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, notifyEmail: event.target.checked }))
                }
                className="h-4 w-4 rounded"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 text-sm">
              <span>Thông báo đẩy (trình duyệt)</span>
              <input
                type="checkbox"
                checked={preferences.notifyPush}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, notifyPush: event.target.checked }))
                }
                className="h-4 w-4 rounded"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 text-sm">
              <span>Nhận tin nhắn từ giảng viên</span>
              <input
                type="checkbox"
                checked={preferences.notifyMentor}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, notifyMentor: event.target.checked }))
                }
                className="h-4 w-4 rounded"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line-soft)] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-extrabold text-[var(--brand-700)]">
          <Globe2 size={20} />
          Quyền riêng tư
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-semibold text-amber-800">Hiển thị hồ sơ</p>
            <p className="mt-1 text-amber-700">
              Chế độ hiển thị hồ sơ hiện được lưu trên trình duyệt. Bạn vẫn có thể bật/tắt nhanh tại đây.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setPreferences((prev) => ({ ...prev, profileVisibility: "public" }))
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  preferences.profileVisibility === "public"
                    ? "bg-amber-700 text-white"
                    : "bg-white text-amber-800"
                }`}
              >
                Công khai
              </button>
              <button
                type="button"
                onClick={() =>
                  setPreferences((prev) => ({ ...prev, profileVisibility: "private" }))
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  preferences.profileVisibility === "private"
                    ? "bg-amber-700 text-white"
                    : "bg-white text-amber-800"
                }`}
              >
                Riêng tư
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleDeactivateAccount()}
            disabled={changingStatus || profile.status === "INACTIVE"}
            className="inline-flex w-full items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70 lg:w-[260px]"
          >
            <span>Vô hiệu hóa tài khoản</span>
            <AlertTriangle size={16} />
          </button>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-[var(--line-soft)] px-5 py-2.5 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-page)]"
        >
          Khôi phục
        </button>
        <button
          type="button"
          onClick={() => void handleSaveAll()}
          disabled={savingAll || (!hasProfileChanges && !hasPreferenceChanges)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={15} />
          {savingAll ? "Đang lưu..." : "Lưu tất cả thay đổi"}
        </button>
      </div>
    </div>
  );
}
