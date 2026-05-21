import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { confirm } from "@/lib/dialog";
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
import { syncStoredAuthUser } from "@/features/auth/services/auth.service";
import { authService } from "@/features/auth/services/auth.service";
import { userService } from "../services/user.service";
import type { UserProfile } from "../types/user.type";
import { extractApiErrorMessage } from "@/lib/error-utils";

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

type ProfileFieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
};

type PasswordFieldErrors = {
  currentPassword?: string;
  nextPassword?: string;
  confirmPassword?: string;
};

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/notionists/svg?seed=scholarly-user";

const extractErrorMessage = (error: unknown): string =>
  extractApiErrorMessage(error, "Đã xảy ra lỗi không xác định.");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{8,20}$/;

const normalizePhoneValue = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeBirthDateValue = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isAtLeastYearsOld = (birthDateValue: string, minimumAge: number): boolean => {
  const today = new Date();
  const birthDate = new Date(`${birthDateValue}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) {
    return false;
  }

  const ageDiff = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  const age = hasHadBirthdayThisYear ? ageDiff : ageDiff - 1;
  return age >= minimumAge;
};

const validateProfileFields = (
  nameValue: string,
  emailValue: string,
  phoneValue: string,
  birthDateValue: string,
): ProfileFieldErrors => {
  const errors: ProfileFieldErrors = {};

  const trimmedName = nameValue.trim();
  if (!trimmedName) {
    errors.name = "Họ tên không được để trống.";
  }

  const trimmedEmail = emailValue.trim();
  if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = "Email không hợp lệ.";
  }

  const normalizedPhone = normalizePhoneValue(phoneValue);
  if (normalizedPhone && !PHONE_PATTERN.test(normalizedPhone)) {
    errors.phone = "Số điện thoại không hợp lệ.";
  }

  const normalizedBirthDate = normalizeBirthDateValue(birthDateValue);
  if (normalizedBirthDate) {
    const dateValue = new Date(`${normalizedBirthDate}T00:00:00`);
    if (Number.isNaN(dateValue.getTime())) {
      errors.birthDate = "Ngày sinh không hợp lệ.";
    } else {
      const now = new Date();
      if (dateValue.getTime() > now.getTime()) {
        errors.birthDate = "Ngày sinh không thể ở tương lai.";
      } else if (!isAtLeastYearsOld(normalizedBirthDate, 13)) {
        errors.birthDate = "Người dùng cần từ 13 tuổi trở lên.";
      }
    }
  }

  return errors;
};

const validatePasswordFields = (form: PasswordForm): PasswordFieldErrors => {
  const errors: PasswordFieldErrors = {};

  if (form.currentPassword.length > 0 && form.currentPassword.trim().length === 0) {
    errors.currentPassword = "Mật khẩu hiện tại không hợp lệ.";
  }

  if (form.nextPassword.length > 0 && form.nextPassword.trim().length < 8) {
    errors.nextPassword = "Mật khẩu mới cần tối thiểu 8 ký tự.";
  }

  if (form.confirmPassword.length > 0 && form.confirmPassword !== form.nextPassword) {
    errors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
  }

  return errors;
};

const formatTimestamp = (isoDate?: string): string => {
  const sourceDate = isoDate ? new Date(isoDate) : new Date();
  if (Number.isNaN(sourceDate.getTime())) {
    return "Chưa đồng bộ";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(sourceDate);
};

const pickComparablePreferences = (preferences: UiPreferences) => ({
  bio: preferences.bio,
  language: preferences.language,
  notifyEmail: preferences.notifyEmail,
  notifyPush: preferences.notifyPush,
  notifyMentor: preferences.notifyMentor,
  profileVisibility: preferences.profileVisibility,
});

const buildDefaultPreferences = (profile: UserProfile): UiPreferences => ({
  username: profile.username,
  bio: "",
  language: "vi-VN",
  notifyEmail: true,
  notifyPush: true,
  notifyMentor: false,
  profileVisibility: "public",
  avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
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
      avatarUrl: profile.avatarUrl || parsed.avatarUrl?.trim() || DEFAULT_AVATAR,
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
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
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
  const [initialPreferences, setInitialPreferences] = useState<UiPreferences>({
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
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(DEFAULT_AVATAR);
  const [lastSyncedAt, setLastSyncedAt] = useState("Chưa đồng bộ");

  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const profileStorageKey = useMemo(
    () => (profile ? `user-profile-ui:${profile.id}` : null),
    [profile],
  );

  const profileErrors = useMemo(
    () => validateProfileFields(name, email, phone, birthDate),
    [name, email, phone, birthDate],
  );

  const passwordErrors = useMemo(() => validatePasswordFields(passwordForm), [passwordForm]);

  const normalizedName = name.trim();
  const normalizedEmail = email.trim();
  const normalizedPhone = normalizePhoneValue(phone) ?? "";
  const normalizedBirthDate = normalizeBirthDateValue(birthDate) ?? "";

  const profileDirty = useMemo(() => {
    if (!profile) {
      return false;
    }

    return (
      normalizedName !== profile.name ||
      normalizedEmail !== profile.email ||
      normalizedPhone !== (profile.phone ?? "") ||
      normalizedBirthDate !== (profile.birthDate ?? "")
    );
  }, [profile, normalizedName, normalizedEmail, normalizedPhone, normalizedBirthDate]);

  const preferencesDirty = useMemo(() => {
    return (
      JSON.stringify(pickComparablePreferences(preferences)) !==
      JSON.stringify(pickComparablePreferences(initialPreferences))
    );
  }, [preferences, initialPreferences]);

  const hasPasswordInput =
    passwordForm.currentPassword.length > 0 ||
    passwordForm.nextPassword.length > 0 ||
    passwordForm.confirmPassword.length > 0;

  const hasUnsavedChanges = profileDirty || preferencesDirty || selectedAvatarFile !== null;

  const canSaveProfile =
    !savingProfile &&
    (profileDirty || selectedAvatarFile !== null) &&
    Object.keys(profileErrors).length === 0;

  const canSavePassword =
    !savingPassword && hasPasswordInput && Object.keys(passwordErrors).length === 0;

  const canSaveAll =
    !savingAll && hasUnsavedChanges && Object.keys(profileErrors).length === 0;

  const clearAvatarObjectUrl = (): void => {
    if (!avatarObjectUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(avatarObjectUrlRef.current);
    avatarObjectUrlRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearAvatarObjectUrl();
    };
  }, []);

  const hydrateFromProfile = (
    nextProfile: UserProfile,
    preferenceOverride?: UiPreferences,
  ): void => {
    clearAvatarObjectUrl();
    const stored = preferenceOverride ?? readStoredPreferences(nextProfile);
    setProfile(nextProfile);
    setName(nextProfile.name);
    setEmail(nextProfile.email);
    setPhone(nextProfile.phone ?? "");
    setBirthDate(nextProfile.birthDate ?? "");
    setPreferences(stored);
    setInitialPreferences(stored);
    setAvatarPreviewUrl(nextProfile.avatarUrl || stored.avatarUrl || DEFAULT_AVATAR);
    setLastSyncedAt(formatTimestamp());
    syncStoredAuthUser({
      id: nextProfile.id,
      email: nextProfile.email,
      role: nextProfile.roles[0],
      roles: nextProfile.roles,
      fullName: nextProfile.name,
      avatarUrl: nextProfile.avatarUrl,
    });
  };

  const persistPreferences = (nextPreferences: UiPreferences = preferences): void => {
    if (typeof window === "undefined" || !profileStorageKey) {
      return;
    }
    window.localStorage.setItem(profileStorageKey, JSON.stringify(nextPreferences));
    setInitialPreferences(nextPreferences);
  };

  const buildPersistedPreferences = (
    nextProfile: UserProfile,
    basePreferences: UiPreferences = preferences,
  ): UiPreferences => ({
    ...basePreferences,
    avatarUrl: nextProfile.avatarUrl || basePreferences.avatarUrl || DEFAULT_AVATAR,
  });

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

    const firstError =
      profileErrors.name ??
      profileErrors.email ??
      profileErrors.phone ??
      profileErrors.birthDate;

    if (firstError) {
      throw new Error(firstError);
    }

    return userService.updateMyProfile({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizePhoneValue(phone),
      birthDate: normalizeBirthDateValue(birthDate),
    });
  };

  const handleSaveProfile = async (): Promise<void> => {
    if (!profileDirty && !selectedAvatarFile) {
      setNotice({ type: "info", message: "Không có thay đổi mới để lưu." });
      return;
    }

    setSavingProfile(true);
    setNotice(null);
    try {
      let updated = await saveProfileToBackend();
      if (selectedAvatarFile) {
        updated = await userService.uploadMyAvatar(selectedAvatarFile);
        clearAvatarObjectUrl();
      }
      const nextPreferences = buildPersistedPreferences(updated, preferences);
      hydrateFromProfile(updated, nextPreferences);
      setSelectedAvatarFile(null);
      persistPreferences(nextPreferences);
      setNotice({ type: "success", message: "Đã cập nhật thông tin cá nhân và ảnh đại diện thành công." });
    } catch (error) {
      setNotice({ type: "error", message: extractErrorMessage(error) });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (): Promise<void> => {
    const firstError =
      passwordErrors.currentPassword ??
      passwordErrors.nextPassword ??
      passwordErrors.confirmPassword;

    if (firstError) {
      setNotice({ type: "error", message: firstError });
      return;
    }

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
      setNotice({
        type: "success",
        message: "Đã cập nhật mật khẩu thành công.",
      });
    } catch (error) {
      setNotice({ type: "error", message: extractErrorMessage(error) });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveAll = async (): Promise<void> => {
    if (!hasUnsavedChanges) {
      setNotice({ type: "info", message: "Không có thay đổi mới để lưu." });
      return;
    }

    setSavingAll(true);
    setNotice(null);
    try {
      let updated = profile;

      if (!updated) {
        throw new Error("Không tìm thấy thông tin người dùng hiện tại.");
      }

      if (profileDirty) {
        updated = await saveProfileToBackend();
      }

      if (selectedAvatarFile) {
        updated = await userService.uploadMyAvatar(selectedAvatarFile);
        clearAvatarObjectUrl();
      }

      const nextPreferences = buildPersistedPreferences(updated, preferences);
      hydrateFromProfile(updated, nextPreferences);
      setSelectedAvatarFile(null);
      persistPreferences(nextPreferences);
      setNotice({
        type: "info",
        message:
          "Đã lưu thông tin hồ sơ và ảnh đại diện lên backend. Các tùy chọn ngôn ngữ/thông báo/hiển thị được lưu cục bộ do backend chưa có API tương ứng.",
      });
    } catch (error) {
      setNotice({ type: "error", message: extractErrorMessage(error) });
    } finally {
      setSavingAll(false);
    }
  };

  const handleSaveAvatar = async (): Promise<void> => {
    if (!selectedAvatarFile) {
      setNotice({ type: "info", message: "Vui lòng chọn ảnh đại diện trước khi lưu." });
      return;
    }

    setSavingAvatar(true);
    setNotice(null);
    try {
      const updated = await userService.uploadMyAvatar(selectedAvatarFile);
      clearAvatarObjectUrl();
      const nextPreferences = buildPersistedPreferences(updated, preferences);
      hydrateFromProfile(updated, nextPreferences);
      setSelectedAvatarFile(null);
      persistPreferences(nextPreferences);
      setNotice({ type: "success", message: "Đã lưu ảnh đại diện thành công." });
    } catch (error) {
      setNotice({ type: "error", message: extractErrorMessage(error) });
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleDeactivateAccount = async (): Promise<void> => {
    if (!profile) {
      return;
    }
    if (typeof window !== "undefined") {
      const confirmed = await confirm("Bạn có chắc chắn muốn vô hiệu hóa tài khoản?");
      if (!confirmed) {
        return;
      }
    }

    setChangingStatus(true);
    setNotice(null);
    try {
      const updated = await userService.updateMyStatus("INACTIVE");
      hydrateFromProfile(updated);
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
    clearAvatarObjectUrl();
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone ?? "");
    setBirthDate(profile.birthDate ?? "");
    setPreferences(stored);
    setInitialPreferences(stored);
    setAvatarPreviewUrl(profile.avatarUrl || stored.avatarUrl || DEFAULT_AVATAR);
    setSelectedAvatarFile(null);
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

    const allowedAvatarTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedAvatarTypes.includes(file.type)) {
      setNotice({ type: "error", message: "Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG, GIF hoặc WEBP." });
      return;
    }

    clearAvatarObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = objectUrl;
    setPreferences((prev) => ({ ...prev, avatarUrl: objectUrl }));
    setAvatarPreviewUrl(objectUrl);
    setSelectedAvatarFile(file);
    setNotice({ type: "info", message: "Ảnh đại diện đã được cập nhật tạm thời. Bấm Lưu tất cả thay đổi để lưu lên MinIO." });
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
        Không thể tải dữ liệu hồ sơ. Vui lòng đăng nhập lại rồi thử đồng bộ hồ sơ.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-[var(--ink-900)]">Cài đặt tài khoản</h1>
        <p className="text-[var(--ink-600)]">
          Cập nhật thông tin cá nhân và thiết lập bảo mật cho hành trình học tập của bạn.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Đồng bộ backend qua API hồ sơ người dùng
          </span>
          <span className="rounded-full border border-[var(--line-soft)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink-600)]">
            Lần đồng bộ gần nhất: {lastSyncedAt}
          </span>
          {hasUnsavedChanges ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Bạn có thay đổi chưa lưu
            </span>
          ) : null}
        </div>
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
              Thông tin cá nhân
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[var(--ink-600)]">Họ và tên</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={`w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)] ${
                      profileErrors.name ? "border-rose-300" : "border-[var(--line-soft)]"
                    }`}
                  />
                  {profileErrors.name ? <p className="text-xs text-rose-600">{profileErrors.name}</p> : null}
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[var(--ink-600)]">Tên hiển thị / Username</span>
                  <input
                    value={preferences.username}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-[var(--line-soft)] bg-slate-100 px-3 py-2.5 text-[var(--ink-500)] outline-none"
                  />
                  <p className="text-xs text-[var(--ink-500)]">
                    Username đồng bộ theo email và hiện chưa có endpoint chỉnh sửa riêng từ backend.
                  </p>
                </label>
              </div>

              <label className="space-y-1.5 text-sm">
                <span className="font-semibold text-[var(--ink-600)]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)] ${
                    profileErrors.email ? "border-rose-300" : "border-[var(--line-soft)]"
                  }`}
                />
                {profileErrors.email ? <p className="text-xs text-rose-600">{profileErrors.email}</p> : null}
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[var(--ink-600)]">Số điện thoại</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Ví dụ: 0901234567"
                    className={`w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)] ${
                      profileErrors.phone ? "border-rose-300" : "border-[var(--line-soft)]"
                    }`}
                  />
                  {profileErrors.phone ? <p className="text-xs text-rose-600">{profileErrors.phone}</p> : null}
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[var(--ink-600)]">Ngày sinh</span>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    className={`w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)] ${
                      profileErrors.birthDate ? "border-rose-300" : "border-[var(--line-soft)]"
                    }`}
                  />
                  {profileErrors.birthDate ? <p className="text-xs text-rose-600">{profileErrors.birthDate}</p> : null}
                </label>
              </div>

              <label className="space-y-1.5 text-sm">
                <span className="font-semibold text-[var(--ink-600)]">Tiểu sử (Bio)</span>
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
                disabled={!canSaveProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save size={15} />
                {savingProfile ? "Đang lưu..." : "Lưu thông tin cá nhân"}
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-[var(--line-soft)] bg-white p-6 text-center">
          <div className="mx-auto w-fit">
            <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-lg">
              <img src={avatarPreviewUrl} alt="Avatar" className="h-full w-full object-cover" />
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
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => avatarFileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line-soft)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-page)]"
              >
                <Camera size={15} />
                Chọn ảnh đại diện
              </button>
              <button
                type="button"
                onClick={() => void handleSaveAvatar()}
                disabled={!selectedAvatarFile || savingAvatar}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-700)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingAvatar ? "Đang lưu ảnh..." : "Lưu ảnh đại diện"}
              </button>
            </div>

            <p className="mt-4 text-sm font-semibold text-[var(--ink-900)]">Ảnh đại diện</p>
            <p className="mt-1 text-xs text-[var(--ink-500)]">JPG, GIF, PNG hoặc WEBP. Tối đa 2MB.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--line-soft)] bg-[var(--bg-page)] p-3 text-left text-xs text-[var(--ink-600)]">
            <p className="font-semibold text-[var(--ink-700)]">Thông tin hệ thống</p>
            <p className="mt-1">ID: {profile.id}</p>
            <p>Vai trò: {profile.roles.join(", ")}</p>
            <p>Trạng thái: {profile.status}</p>
            <p>Số điện thoại: {profile.phone || "Chưa cập nhật"}</p>
            <p>Ngày sinh: {profile.birthDate || "Chưa cập nhật"}</p>
            <p>XP: {profile.xp}</p>
          </div>
        </aside>
      </section>

      <section className="rounded-3xl border border-[var(--line-soft)] bg-white p-6">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[var(--brand-700)]">
          <Lock size={20} />
          Bảo mật tài khoản
        </h2>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink-500)]">Đổi mật khẩu</p>

            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[var(--ink-600)]">Mật khẩu hiện tại</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                className={`w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)] ${
                  passwordErrors.currentPassword ? "border-rose-300" : "border-[var(--line-soft)]"
                }`}
              />
              {passwordErrors.currentPassword ? (
                <p className="text-xs text-rose-600">{passwordErrors.currentPassword}</p>
              ) : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[var(--ink-600)]">Mật khẩu mới</span>
              <input
                type="password"
                value={passwordForm.nextPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, nextPassword: event.target.value }))
                }
                className={`w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)] ${
                  passwordErrors.nextPassword ? "border-rose-300" : "border-[var(--line-soft)]"
                }`}
              />
              {passwordErrors.nextPassword ? (
                <p className="text-xs text-rose-600">{passwordErrors.nextPassword}</p>
              ) : (
                <p className="text-xs text-[var(--ink-500)]">Mật khẩu nên có tối thiểu 8 ký tự.</p>
              )}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[var(--ink-600)]">Xác nhận mật khẩu mới</span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                className={`w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)] ${
                  passwordErrors.confirmPassword ? "border-rose-300" : "border-[var(--line-soft)]"
                }`}
              />
              {passwordErrors.confirmPassword ? (
                <p className="text-xs text-rose-600">{passwordErrors.confirmPassword}</p>
              ) : null}
            </label>

            <button
              type="button"
              onClick={() => void handleSavePassword()}
              disabled={!canSavePassword}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Shield size={15} />
              {savingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink-500)]">Tài khoản liên kết</p>

            <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--bg-page)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm">
                    <Mail size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink-900)]">Google</p>
                    <p className="text-xs text-emerald-600">Đã kết nối (hiển thị mẫu)</p>
                  </div>
                </div>
                <button type="button" className="text-xs font-semibold text-rose-600">
                  Hủy kết nối
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
                    <p className="text-xs text-[var(--ink-500)]">Chưa kết nối</p>
                  </div>
                </div>
                <button type="button" className="text-xs font-semibold text-[var(--brand-700)]">
                  Kết nối ngay
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              Chức năng liên kết tài khoản chưa có endpoint tương ứng trong backend hiện tại.
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--line-soft)] bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-[var(--brand-700)]">
            <BellRing size={20} />
            Tùy chọn hiển thị
          </h2>

          <div className="space-y-4">
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[var(--ink-600)]">Ngôn ngữ hệ thống</span>
              <select
                value={preferences.language}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, language: event.target.value }))
                }
                className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
              >
                <option value="vi-VN">Tiếng Việt (Việt Nam)</option>
                <option value="en-US">English (US)</option>
                <option value="ja-JP">Nihongo (Japan)</option>
              </select>
            </label>

            <label className="flex items-center justify-between rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 text-sm">
              <span>Thông báo qua Email</span>
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
              <span>Tin nhắn từ giảng viên</span>
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
            Quyền riêng tư
          </h2>

          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-semibold text-amber-800">Trạng thái hồ sơ</p>
              <p className="mt-1 text-amber-700">
                API backend hiện chưa có endpoint riêng cho profile visibility, trạng thái này được lưu cục bộ.
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
              className="flex w-full items-center justify-between rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2.5 text-sm"
            >
              <span>Xuất dữ liệu cá nhân</span>
              <span className="text-[var(--ink-400)]">(sắp có)</span>
            </button>

            <button
              type="button"
              onClick={() => void handleDeactivateAccount()}
              disabled={changingStatus || profile.status === "INACTIVE"}
              className="flex w-full items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span>Vô hiệu hóa tài khoản</span>
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
          Hủy thay đổi
        </button>
        <button
          type="button"
          onClick={() => void handleSaveAll()}
          disabled={!canSaveAll}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save size={15} />
          {savingAll ? "Đang lưu..." : "Lưu tất cả thay đổi"}
        </button>
      </div>
    </div>
  );
}

