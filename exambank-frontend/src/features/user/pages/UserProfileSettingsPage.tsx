import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Camera,
  Eye,
  Globe2,
  Lock,
  Mail,
  Save,
  Shield,
  UserCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/features/auth/services/auth.service";
import { userService } from "../services/user.service";
import type { UserProfile } from "../types/user.type";

type NoticeType = "success" | "error" | "info";

type UiPreferences = {
  username: string;
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

  return "Da xay ra loi khong xac dinh.";
};

const buildDefaultPreferences = (profile: UserProfile): UiPreferences => ({
  username: profile.username,
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
    return buildDefaultPreferences(profile);
  }

  const key = `user-profile-ui:${profile.id}`;
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return buildDefaultPreferences(profile);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      ...buildDefaultPreferences(profile),
      ...parsed,
      username: parsed.username?.trim() || profile.username,
      avatarUrl: parsed.avatarUrl?.trim() || DEFAULT_AVATAR,
      profileVisibility: parsed.profileVisibility === "private" ? "private" : "public",
    };
  } catch {
    return buildDefaultPreferences(profile);
  }
};

export default function UserProfileSettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [preferences, setPreferences] = useState<UiPreferences>({
    username: "",
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
  };

  const persistPreferences = (): void => {
    if (typeof window === "undefined" || !profileStorageKey) {
      return;
    }
    window.localStorage.setItem(profileStorageKey, JSON.stringify(preferences));
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
      throw new Error("Khong tim thay thong tin nguoi dung hien tai.");
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      throw new Error("Ho ten khong duoc de trong.");
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      throw new Error("Email khong hop le.");
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
      const updated = await saveProfileToBackend();
      hydrateFromProfile(updated);
      persistPreferences();
      setNotice({ type: "success", message: "Da cap nhat thong tin ca nhan thanh cong." });
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
        throw new Error("Vui long nhap mat khau hien tai.");
      }
      if (passwordForm.nextPassword.trim().length < 8) {
        throw new Error("Mat khau moi can toi thieu 8 ky tu.");
      }
      if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
        throw new Error("Mat khau xac nhan khong trung khop.");
      }

      await userService.updateMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.nextPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
      setNotice({
        type: "success",
        message: "Da cap nhat mat khau thanh cong.",
      });
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
      const updated = await saveProfileToBackend();
      hydrateFromProfile(updated);
      persistPreferences();
      setNotice({
        type: "info",
        message:
          "Da luu thong tin ho so len backend. Cac tuy chon ngon ngu/thong bao/hien thi duoc luu cuc bo do backend chua co API tuong ung.",
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
      const confirmed = window.confirm("Ban co chac chan muon vo hieu hoa tai khoan?");
      if (!confirmed) {
        return;
      }
    }

    setChangingStatus(true);
    setNotice(null);
    try {
      const updated = await userService.updateMyStatus("INACTIVE");
      hydrateFromProfile(updated);
      setNotice({ type: "success", message: "Tai khoan da duoc chuyen sang trang thai INACTIVE." });
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
      setNotice({ type: "error", message: "Kich thuoc anh vuot qua 2MB." });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreferences((prev) => ({ ...prev, avatarUrl: objectUrl }));
    setNotice({ type: "info", message: "Anh dai dien da duoc cap nhat tam thoi. Bam Luu tat ca thay doi de ghi nho." });
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--line-soft)] bg-white p-8 text-center text-[var(--ink-600)]">
        Dang tai du lieu ho so...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        Khong the tai du lieu ho so. Vui long dang nhap de su dung endpoint /api/v1/users/me.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-[var(--ink-900)]">Cai dat tai khoan</h1>
        <p className="text-[var(--ink-600)]">
          Cap nhat thong tin ca nhan va thiet lap bao mat cho hanh trinh hoc tap cua ban.
        </p>
      </header>

      {notice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
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

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl border border-[var(--line-soft)] bg-white p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-[var(--brand-700)]">
              <UserCircle2 size={20} />
              Thong tin ca nhan
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[var(--ink-600)]">Ho va ten</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[var(--ink-600)]">Ten hien thi / Username</span>
                  <input
                    value={preferences.username}
                    onChange={(event) =>
                      setPreferences((prev) => ({ ...prev, username: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
                  />
                </label>
              </div>

              <label className="space-y-1.5 text-sm">
                <span className="font-semibold text-[var(--ink-600)]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="font-semibold text-[var(--ink-600)]">Tieu su (Bio)</span>
                <textarea
                  rows={4}
                  value={preferences.bio}
                  onChange={(event) =>
                    setPreferences((prev) => ({ ...prev, bio: event.target.value }))
                  }
                  className="w-full resize-none rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save size={15} />
                {savingProfile ? "Dang luu..." : "Luu thong tin ca nhan"}
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-[var(--line-soft)] bg-white p-6 text-center">
          <div className="mx-auto w-fit">
            <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-lg">
              <img src={preferences.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => avatarFileInputRef.current?.click()}
                className="absolute bottom-0 right-0 rounded-full bg-[var(--brand-700)] p-2 text-white"
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

            <p className="mt-4 text-sm font-semibold text-[var(--ink-900)]">Anh dai dien</p>
            <p className="mt-1 text-xs text-[var(--ink-500)]">JPG, GIF hoac PNG. Toi da 2MB.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--line-soft)] bg-[var(--bg-page)] p-3 text-left text-xs text-[var(--ink-600)]">
            <p className="font-semibold text-[var(--ink-700)]">Thong tin he thong</p>
            <p className="mt-1">ID: {profile.id}</p>
            <p>Vai tro: {profile.roles.join(", ")}</p>
            <p>Trang thai: {profile.status}</p>
            <p>XP: {profile.xp}</p>
          </div>
        </aside>
      </section>

      <section className="rounded-3xl border border-[var(--line-soft)] bg-white p-6">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[var(--brand-700)]">
          <Lock size={20} />
          Bao mat tai khoan
        </h2>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink-500)]">Doi mat khau</p>

            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[var(--ink-600)]">Mat khau hien tai</span>
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
              <span className="font-semibold text-[var(--ink-600)]">Mat khau moi</span>
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
              <span className="font-semibold text-[var(--ink-600)]">Xac nhan mat khau moi</span>
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
              {savingPassword ? "Dang cap nhat..." : "Cap nhat mat khau"}
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink-500)]">Tai khoan lien ket</p>

            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--bg-page)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm">
                    <Mail size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink-900)]">Google</p>
                    <p className="text-xs text-emerald-600">Da ket noi (hien thi mau)</p>
                  </div>
                </div>
                <button type="button" className="text-xs font-semibold text-rose-600">
                  Huy ket noi
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--bg-page)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm">
                    <Eye size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink-900)]">Facebook</p>
                    <p className="text-xs text-[var(--ink-500)]">Chua ket noi</p>
                  </div>
                </div>
                <button type="button" className="text-xs font-semibold text-[var(--brand-700)]">
                  Ket noi ngay
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              Chuc nang lien ket tai khoan chua co endpoint tuong ung trong backend hien tai.
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--line-soft)] bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-[var(--brand-700)]">
            <BellRing size={20} />
            Tuy chon hien thi
          </h2>

          <div className="space-y-4">
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[var(--ink-600)]">Ngon ngu he thong</span>
              <select
                value={preferences.language}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, language: event.target.value }))
                }
                className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
              >
                <option value="vi-VN">Tieng Viet (Vietnam)</option>
                <option value="en-US">English (US)</option>
                <option value="ja-JP">Nihongo (Japan)</option>
              </select>
            </label>

            <label className="flex items-center justify-between rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 text-sm">
              <span>Thong bao qua Email</span>
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
              <span>Thong bao day (Browser)</span>
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
              <span>Tin nhan tu giang vien</span>
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

        <div className="rounded-3xl border border-[var(--line-soft)] bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-[var(--brand-700)]">
            <Globe2 size={20} />
            Quyen rieng tu
          </h2>

          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-semibold text-amber-800">Trang thai ho so</p>
              <p className="mt-1 text-amber-700">
                API backend hien chua co endpoint rieng cho profile visibility, trang thai nay duoc luu cuc bo.
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
                  Cong khai
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
                  Rieng tu
                </button>
              </div>
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 text-sm"
            >
              <span>Xuat du lieu ca nhan</span>
              <span className="text-[var(--ink-400)]">(sap co)</span>
            </button>

            <button
              type="button"
              onClick={() => void handleDeactivateAccount()}
              disabled={changingStatus || profile.status === "INACTIVE"}
              className="flex w-full items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span>Vo hieu hoa tai khoan</span>
              <AlertTriangle size={16} />
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-[var(--line-soft)] px-5 py-2.5 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-page)]"
        >
          Huy thay doi
        </button>
        <button
          type="button"
          onClick={() => void handleSaveAll()}
          disabled={savingAll}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save size={15} />
          {savingAll ? "Dang luu..." : "Luu tat ca thay doi"}
        </button>
      </div>
    </div>
  );
}
