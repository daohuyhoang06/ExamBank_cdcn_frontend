import { Camera, CheckCircle2, Shield } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button/button";
import { Card } from "@/components/ui/Card/card";
import { Input } from "@/components/ui/Input/input";
import { syncStoredAuthUser } from "@/features/auth/services/auth.service";
import { getStoredAuthUser } from "@/features/auth/services/auth.service";
import { userService } from "@/features/user/services/user.service";
import type { UserProfile } from "@/features/user/types/user.type";
import { extractApiErrorMessage } from "@/lib/error-utils";

const initialAdminProfile = {
  fullName: "Nguyễn Văn Quản Trị",
  adminId: "ADM-8821094",
  email: "quantri@scholarly.vn",
  role: "Quản trị viên",
  organization: "Admin Control Center",
  phone: "+84 987 123 456",
  accountStatus: "Hoạt động",
  createdAt: "15/01/2023",
  address: "Hà Nội, Việt Nam",
  latestLogin: "Hôm nay, 14:22",
  device: "MacBook Pro (Chrome)",
  ipAddress: "192.168.1.45",
  lastPasswordChangedAt: "12/03/2026 09:10",
  avatarUrl: "",
};

type AdminProfile = typeof initialAdminProfile;
const STORAGE_PUBLIC_ENDPOINT = (
  import.meta.env.VITE_STORAGE_PUBLIC_ENDPOINT ??
  import.meta.env.VITE_API_BASE_URL ??
  ""
).replace(/\/+$/, "");

const formatDate = (value?: string): string => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toPublicAssetUrl = (value: string | null | undefined): string | null => {
  const normalized = toNonEmptyString(value);
  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  if (normalized.startsWith("storage://")) {
    const pathWithoutScheme = normalized.slice("storage://".length);
    const firstSlash = pathWithoutScheme.indexOf("/");
    if (firstSlash <= 0) {
      return null;
    }

    const bucket = pathWithoutScheme.slice(0, firstSlash);
    const objectKey = pathWithoutScheme.slice(firstSlash + 1);
    return `${STORAGE_PUBLIC_ENDPOINT}/api/v1/storage/${encodeURIComponent(bucket)}?key=${encodeURIComponent(objectKey)}`;
  }

  if (normalized.startsWith("/")) {
    return `${STORAGE_PUBLIC_ENDPOINT}${normalized}`;
  }

  return `${STORAGE_PUBLIC_ENDPOINT}/${normalized.replace(/^\/+/, "")}`;
};

const buildFallbackAvatarUrl = (seed: string): string => {
  const finalSeed = seed.trim() || "scholarly-user";
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(finalSeed)}`;
};

const getAvatarFromStoredPreferences = (userId: string | number | null | undefined): string | null => {
  if (typeof window === "undefined" || userId === undefined || userId === null) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`user-profile-ui:${userId}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { avatarUrl?: string };
    return toPublicAssetUrl(parsed.avatarUrl);
  } catch {
    return null;
  }
};

const formatRoleLabel = (roles: string[]): string => {
  if (roles.includes("ADMIN")) {
    return "Quản trị viên";
  }

  if (roles.includes("MODERATOR")) {
    return "Cộng tác viên";
  }

  if (roles.includes("USER")) {
    return "Người dùng";
  }

  return roles[0] ?? "Người dùng";
};

const formatAccountStatus = (status: UserProfile["status"]): string => {
  if (status === "INACTIVE") {
    return "Tạm ngưng";
  }

  if (status === "BANNED") {
    return "Bị khóa";
  }

  return "Hoạt động";
};

const mapProfileToViewModel = (profile: UserProfile): AdminProfile => ({
  fullName: profile.name,
  adminId: `ADM-${String(profile.id).padStart(7, "0")}`,
  email: profile.email,
  role: formatRoleLabel(profile.roles),
  organization: profile.roles.includes("ADMIN")
    ? "Admin Control Center"
    : profile.roles.includes("MODERATOR")
      ? "Moderator Control Center"
      : "Scholarly Control Center",
  phone: "Chưa cập nhật",
  accountStatus: formatAccountStatus(profile.status),
  createdAt: formatDate(profile.createdAt),
  address: "Chưa có dữ liệu",
  latestLogin: "Chưa có dữ liệu",
  device: "Chưa có dữ liệu",
  ipAddress: "Chưa có dữ liệu",
  lastPasswordChangedAt: "Chưa có dữ liệu",
  avatarUrl: profile.avatarUrl ?? "",
});

const extractErrorMessage = (error: unknown): string =>
  extractApiErrorMessage(error, "Đã xảy ra lỗi không xác định.");

const buildInitialProfile = (): AdminProfile => {
  const storedUser = getStoredAuthUser();

  if (!storedUser) {
    return initialAdminProfile;
  }

  const roleList = storedUser.roles ?? (storedUser.role ? [storedUser.role] : []);
  const resolvedRole = roleList.includes("ADMIN")
    ? "Quản trị viên"
    : roleList.includes("MODERATOR")
      ? "Cộng tác viên"
      : roleList[0] ?? "Người dùng";

  return {
    ...initialAdminProfile,
    fullName: storedUser.fullName ?? storedUser.email ?? initialAdminProfile.fullName,
    email: storedUser.email ?? initialAdminProfile.email,
    role: resolvedRole,
    adminId:
      typeof storedUser.id === "number" || typeof storedUser.id === "string"
        ? `ADM-${String(storedUser.id).padStart(7, "0")}`
        : initialAdminProfile.adminId,
    organization: roleList.includes("ADMIN")
      ? "Admin Control Center"
      : roleList.includes("MODERATOR")
        ? "Moderator Control Center"
        : initialAdminProfile.organization,
  };
};

export default function AdminProfileDetailPage() {
  const storedAuthUser = useMemo(() => getStoredAuthUser(), []);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(buildInitialProfile);
  const [profileBaseline, setProfileBaseline] = useState(buildInitialProfile);
  const avatarUrl = useMemo(() => {
    const authAvatar = toPublicAssetUrl((storedAuthUser as { avatarUrl?: string } | null)?.avatarUrl);
    if (authAvatar) {
      return authAvatar;
    }

    const preferenceAvatar = getAvatarFromStoredPreferences(storedAuthUser?.id);
    if (preferenceAvatar) {
      return preferenceAvatar;
    }

    return buildFallbackAvatarUrl(storedAuthUser?.fullName ?? storedAuthUser?.email ?? "scholarly-user");
  }, [storedAuthUser]);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [selectedAvatarName, setSelectedAvatarName] = useState("");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const fallbackAvatarUrl = useMemo(
    () => buildFallbackAvatarUrl(profileForm.fullName || profileForm.email || "scholarly-user"),
    [profileForm.email, profileForm.fullName]
  );
  const effectiveAvatarUrl = avatarPreviewUrl ?? avatarUrl ?? fallbackAvatarUrl;

  const handleFieldChange = (field: keyof typeof initialAdminProfile, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    let isActive = true;

    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError(null);

      try {
        const profile = await userService.getMyProfile();
        if (!isActive) {
          return;
        }

        const mappedProfile = mapProfileToViewModel(profile);
        setProfileForm(mappedProfile);
        setProfileBaseline(mappedProfile);
        setAvatarPreviewUrl(mappedProfile.avatarUrl || null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setProfileError(extractErrorMessage(error));
      } finally {
        if (isActive) {
          setIsLoadingProfile(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
    };
  }, []);

  const handleCancelEdit = () => {
    setProfileForm(profileBaseline);
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreviewUrl(null);
    setSelectedAvatarName("");
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl(profileBaseline.avatarUrl || null);
    setIsEditing(false);
  };


  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError(null);

    try {
      let updated = await userService.updateMyProfile({
        name: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        status:
          profileForm.accountStatus === "Bị khóa"
            ? "BANNED"
            : profileForm.accountStatus === "Tạm ngưng"
              ? "INACTIVE"
              : "ACTIVE",
      });

      if (selectedAvatarFile) {
        updated = await userService.uploadMyAvatar(selectedAvatarFile);
      }

      // Always refresh from backend after save so UI state uses canonical profile data.
      updated = await userService.getMyProfile();

      const mappedProfile = mapProfileToViewModel(updated);
      const resolvedAvatarUrl = updated.avatarUrl?.trim() || avatarPreviewUrl || profileBaseline.avatarUrl;
      mappedProfile.avatarUrl = resolvedAvatarUrl;
      setProfileForm(mappedProfile);
      setProfileBaseline(mappedProfile);
      setAvatarPreviewUrl(resolvedAvatarUrl);
      setSelectedAvatarName("");
      setSelectedAvatarFile(null);
      syncStoredAuthUser({
        id: updated.id,
        email: updated.email,
        role: updated.roles[0],
        roles: updated.roles,
        fullName: updated.name,
        avatarUrl: resolvedAvatarUrl,
      });
      setIsEditing(false);
    } catch (error) {
      setProfileError(extractErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChooseAvatar = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setSelectedAvatarName(selectedFile?.name ?? "");
    setSelectedAvatarFile(selectedFile ?? null);
    if (selectedFile) {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(selectedFile);
      avatarObjectUrlRef.current = objectUrl;
      setAvatarPreviewUrl(objectUrl);
    }
  };



  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-[radial-gradient(circle_at_top_right,_rgba(31,99,180,0.13),_transparent_65%),linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-6 shadow-[var(--shadow-soft)] lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="w-24 shrink-0 space-y-2 lg:w-28">
              <div className="relative inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-[var(--brand-100)] text-[var(--brand-700)] ring-4 ring-white lg:h-24 lg:w-24">
                {effectiveAvatarUrl ? (
                  <img src={effectiveAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <Shield size={34} />
                )}
                <span className="absolute -bottom-2 -right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white">
                  <CheckCircle2 size={16} />
                </span>
              </div>

              {isEditing ? (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    leftIcon={<Camera size={14} />}
                    onClick={handleChooseAvatar}
                    className="w-full"
                  >
                    Thay đổi ảnh
                  </Button>
                </>
              ) : null}
            </div>

            <div>
              <h1 className="font-[var(--font-label)] text-3xl font-extrabold tracking-tight text-[var(--brand-700)] lg:text-4xl">
                {profileForm.fullName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.08em]">
                <span className="rounded-full bg-[var(--bg-soft)] px-3 py-1 text-[var(--ink-600)]">
                  ID: {profileForm.adminId}
                </span>
                <span className="rounded-full bg-[var(--brand-100)] px-3 py-1 text-[var(--brand-700)]">
                  {profileForm.role}
                </span>
              </div>
              {isEditing && selectedAvatarName ? (
                <p className="mt-2 text-xs font-medium text-[var(--ink-600)]">Ảnh đã chọn: {selectedAvatarName}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isEditing ? (
              <Button type="button" variant="secondary" size="md" onClick={() => setIsEditing(true)}>
                Chỉnh sửa hồ sơ
              </Button>
            ) : (
              <>
                <Button type="button" variant="ghost" size="md" onClick={handleCancelEdit}>
                  Hủy
                </Button>
                <Button type="button" variant="primary" size="md" onClick={() => void handleSaveProfile()} disabled={isSavingProfile}>
                  {isSavingProfile ? "Đang lưu..." : "Lưu"}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <Card
        variant="default"
        padding="lg"
        title="Thông tin cá nhân"
        subtitle="Dữ liệu cá nhân của quản trị viên"
        bodyClassName="mt-6"
      >
        {profileError ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {profileError}
          </div>
        ) : null}

        {isLoadingProfile ? (
          <div className="mb-4 rounded-2xl border border-[var(--line-soft)] bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--ink-600)]">
            Đang tải dữ liệu hồ sơ...
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Họ và tên"
            value={profileForm.fullName}
            onChange={(event) => handleFieldChange("fullName", event.target.value)}
            inputClassName="h-11"
            readOnly={!isEditing || isLoadingProfile}
          />
          <Input label="Vai trò" value={profileForm.role} inputClassName="h-11" readOnly />
          <Input
            label="Email"
            value={profileForm.email}
            onChange={(event) => handleFieldChange("email", event.target.value)}
            inputClassName="h-11"
            readOnly={!isEditing || isLoadingProfile}
          />
          <Input
            label="Số điện thoại"
            value={profileForm.phone}
            onChange={(event) => handleFieldChange("phone", event.target.value)}
            inputClassName="h-11"
            readOnly={!isEditing || isLoadingProfile}
          />
          <div className="flex flex-col gap-2">
            <label className="font-[var(--font-label)] text-[0.82rem] font-bold tracking-[0.12em] text-[var(--ink-600)]">
              Trạng thái tài khoản
            </label>
            <select
              value={profileForm.accountStatus}
              onChange={(event) => handleFieldChange("accountStatus", event.target.value)}
              className="h-14 rounded-[var(--radius-field)] border border-transparent bg-[var(--bg-soft)] px-3.5 text-base text-[var(--ink-900)] outline-none transition duration-200 focus:border-[var(--brand-500)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isEditing || isLoadingProfile}
            >
              <option>Hoạt động</option>
              <option>Bị khóa</option>
              <option>Tạm ngưng</option>
            </select>
          </div>
          <Input
            label="Ngày tạo tài khoản"
            value={profileForm.createdAt}
            onChange={(event) => handleFieldChange("createdAt", event.target.value)}
            inputClassName="h-11"
            readOnly={!isEditing || isLoadingProfile}
          />
          <Input label="Đơn vị" value={profileForm.organization} inputClassName="h-11" readOnly />
          <Input label="IP hiện tại" value={profileForm.ipAddress} inputClassName="h-11" readOnly />
        </div>
      </Card>

    </div>
  );
}
