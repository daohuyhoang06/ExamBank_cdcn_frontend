import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  Filter,
  LogOut,
  KeyRound,
  MapPin,
  Monitor,
  Shield,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button/button";
import { Card } from "@/components/ui/Card/card";
import { Input } from "@/components/ui/Input/input";
import { Table, type TableColumn } from "@/components/ui/Table/table";
import { ChangePasswordModal } from "@/features/auth/pages/change-password-modal";
import { getStoredAuthUser } from "@/features/auth/services/auth.service";
import { userService } from "@/features/user/services/user.service";
import type { UserProfile } from "@/features/user/types/user.type";

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
};

type AdminProfile = typeof initialAdminProfile;
const MINIO_PUBLIC_ENDPOINT = (import.meta.env.VITE_MINIO_PUBLIC_ENDPOINT ?? "http://localhost:9000").replace(/\/+$/, "");

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
    const encodedObjectKey = objectKey
      .split("/")
      .filter((segment) => segment.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `${MINIO_PUBLIC_ENDPOINT}/${encodeURIComponent(bucket)}/${encodedObjectKey}`;
  }

  if (normalized.startsWith("/")) {
    return `${MINIO_PUBLIC_ENDPOINT}${normalized}`;
  }

  return `${MINIO_PUBLIC_ENDPOINT}/${normalized.replace(/^\/+/, "")}`;
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
});

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

type SessionItem = {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  status: "Đang hoạt động" | "Đăng nhập gần đây";
  lastSeen: string;
};

const activeSessions: SessionItem[] = [
  {
    id: "s1",
    device: "MacBook Pro - Chrome",
    location: "Hà Nội, Việt Nam",
    ipAddress: "192.168.1.45",
    status: "Đang hoạt động",
    lastSeen: "Vừa xong",
  },
  {
    id: "s2",
    device: "iPhone 15 - Safari",
    location: "Hà Nội, Việt Nam",
    ipAddress: "172.16.0.10",
    status: "Đăng nhập gần đây",
    lastSeen: "10 phút trước",
  },
  {
    id: "s3",
    device: "Windows PC - Edge",
    location: "Đà Nẵng, Việt Nam",
    ipAddress: "10.0.1.12",
    status: "Đăng nhập gần đây",
    lastSeen: "Hôm qua, 22:16",
  },
];

type ActivityLog = {
  id: string;
  action: string;
  target: string;
  time: string;
  ipAddress: string;
  status: "ok" | "warning" | "neutral" | "critical";
  category: "Duyệt nội dung" | "Quản lý user" | "Cấu hình hệ thống" | "Dữ liệu";
  period: "Hôm nay" | "7 ngày" | "30 ngày";
};

const activityLogs: ActivityLog[] = [
  {
    id: "l1",
    action: "Phê duyệt kỳ thi",
    target: "#Q-10492",
    time: "10:45 AM, 24/05/2024",
    ipAddress: "192.168.1.45",
    status: "ok",
    category: "Duyệt nội dung",
    period: "7 ngày",
  },
  {
    id: "l2",
    action: "Khóa người dùng",
    target: "#U-8821",
    time: "09:12 AM, 24/05/2024",
    ipAddress: "192.168.1.45",
    status: "critical",
    category: "Quản lý user",
    period: "Hôm nay",
  },
  {
    id: "l3",
    action: "Cập nhật policy",
    target: "Quy định bảo mật v2.4",
    time: "Hôm qua, 17:30",
    ipAddress: "172.16.0.104",
    status: "neutral",
    category: "Cấu hình hệ thống",
    period: "7 ngày",
  },
  {
    id: "l4",
    action: "Xuất báo cáo tài chính",
    target: "Tháng 04/2024",
    time: "22/05/2024, 14:05",
    ipAddress: "10.0.0.12",
    status: "ok",
    category: "Dữ liệu",
    period: "30 ngày",
  },
  {
    id: "l5",
    action: "Xóa dữ liệu đề thi",
    target: "#EX-70091",
    time: "08:10 AM, 24/05/2024",
    ipAddress: "192.168.1.45",
    status: "critical",
    category: "Dữ liệu",
    period: "Hôm nay",
  },
];

function logStatusClasses(status: ActivityLog["status"]) {
  if (status === "critical") {
    return "bg-rose-600";
  }

  if (status === "warning") {
    return "bg-rose-500";
  }

  if (status === "neutral") {
    return "bg-blue-500";
  }

  return "bg-emerald-500";
}

export default function AdminProfileDetailPage() {
  const storedAuthUser = useMemo(() => getStoredAuthUser(), []);
  const [isEditing, setIsEditing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<ActivityLog["period"] | "Tất cả">("Tất cả");
  const [actionFilter, setActionFilter] = useState<ActivityLog["category"] | "Tất cả">("Tất cả");
  const [profileForm, setProfileForm] = useState(buildInitialProfile);
  const [profileBaseline, setProfileBaseline] = useState(buildInitialProfile);
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    const authAvatar = toPublicAssetUrl((storedAuthUser as { avatarUrl?: string } | null)?.avatarUrl);
    if (authAvatar) {
      return authAvatar;
    }

    const preferenceAvatar = getAvatarFromStoredPreferences(storedAuthUser?.id);
    if (preferenceAvatar) {
      return preferenceAvatar;
    }

    return buildFallbackAvatarUrl(storedAuthUser?.fullName ?? storedAuthUser?.email ?? "scholarly-user");
  });
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [selectedAvatarName, setSelectedAvatarName] = useState("");
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const matchTime = timeFilter === "Tất cả" || log.period === timeFilter;
      const matchAction = actionFilter === "Tất cả" || log.category === actionFilter;

      return matchTime && matchAction;
    });
  }, [timeFilter, actionFilter]);

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
        const profileAvatar = toPublicAssetUrl(profile.avatarUrl);
        const storedPreferenceAvatar = getAvatarFromStoredPreferences(profile.id);
        setAvatarUrl(
          profileAvatar ??
            storedPreferenceAvatar ??
            buildFallbackAvatarUrl(profile.name || profile.email || mappedProfile.fullName)
        );
      } catch {
        if (!isActive) {
          return;
        }

        setProfileForm(buildInitialProfile());
        setProfileError(null);
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
    setAvatarLoadFailed(false);
  }, [effectiveAvatarUrl]);

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
    setIsEditing(false);
  };

  const handleSaveProfile = () => {
    if (avatarPreviewUrl) {
      setAvatarUrl(avatarPreviewUrl);
      avatarObjectUrlRef.current = null;
      setAvatarPreviewUrl(null);
    }
    setProfileBaseline(profileForm);
    setIsEditing(false);
  };

  const handleChooseAvatar = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }

    const nextObjectUrl = URL.createObjectURL(selectedFile);
    avatarObjectUrlRef.current = nextObjectUrl;
    setAvatarPreviewUrl(nextObjectUrl);
    setSelectedAvatarName(selectedFile.name);
  };


  const activityColumns: TableColumn<ActivityLog>[] = [
    {
      key: "action",
      label: "Hành động",
      cellClassName: "font-semibold text-[var(--ink-900)]",
      render: (row) => (
        <span
          className={`inline-flex items-center gap-2 rounded-md px-2 py-1 ${
            row.status === "critical" ? "bg-rose-50 text-rose-800" : ""
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${logStatusClasses(row.status)}`} />
          {row.action}
        </span>
      ),
    },
    {
      key: "target",
      label: "Đối tượng",
      cellClassName: "text-[var(--ink-700)]",
    },
    {
      key: "time",
      label: "Thời gian",
      cellClassName: "text-[var(--ink-600)]",
    },
    {
      key: "ipAddress",
      label: "IP Address",
      headerClassName: "text-right",
      cellClassName: "text-right font-mono text-xs text-[var(--ink-600)]",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-[radial-gradient(circle_at_top_right,_rgba(31,99,180,0.13),_transparent_65%),linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-6 shadow-[var(--shadow-soft)] lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="w-24 shrink-0 space-y-2 lg:w-28">
              <div className="relative inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-[var(--brand-100)] text-[var(--brand-700)] ring-4 ring-white lg:h-24 lg:w-24">
                {avatarLoadFailed ? (
                  <Shield size={34} />
                ) : (
                  <img
                    src={effectiveAvatarUrl}
                    alt={`Avatar ${profileForm.fullName}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={() => setAvatarLoadFailed(true)}
                  />
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
                <Button type="button" variant="primary" size="md" onClick={handleSaveProfile}>
                  Lưu
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

      <Card
        variant="default"
        padding="none"
        title="Nhật ký hoạt động"
        subtitle="Theo dõi thao tác và hành động nhạy cảm của quản trị viên"
        headerClassName="p-6 pb-0"
        bodyClassName="mt-5"
      >
        <div className="flex flex-col gap-3 px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[var(--ink-500)]" />
              <select
                value={timeFilter}
                onChange={(event) => setTimeFilter(event.target.value as ActivityLog["period"] | "Tất cả")}
                className="h-10 rounded-[var(--radius-field)] border border-[var(--line-soft)] bg-white px-3 text-sm text-[var(--ink-800)]"
              >
                <option>Tất cả</option>
                <option>Hôm nay</option>
                <option>7 ngày</option>
                <option>30 ngày</option>
              </select>
            </div>

            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value as ActivityLog["category"] | "Tất cả")}
              className="h-10 rounded-[var(--radius-field)] border border-[var(--line-soft)] bg-white px-3 text-sm text-[var(--ink-800)]"
            >
              <option>Tất cả</option>
              <option>Duyệt nội dung</option>
              <option>Quản lý user</option>
              <option>Cấu hình hệ thống</option>
              <option>Dữ liệu</option>
            </select>
          </div>

          <Button type="button" variant="soft" size="sm">
            Xem toàn bộ log
          </Button>
        </div>

        <Table<ActivityLog>
          columns={activityColumns}
          data={filteredLogs}
          dense
          className="mt-4 rounded-none border-x-0 border-b-0 border-t"
          tableClassName="min-w-[760px]"
        />
      </Card>

      <Card
        variant="default"
        padding="lg"
        title="Bảo mật"
        subtitle="Dữ liệu hệ thống liên quan đến truy cập và an toàn tài khoản"
        bodyClassName="mt-6 space-y-5"
      >
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800">
              <ShieldCheck size={16} /> Xác thực 2 yếu tố (2FA)
            </p>
            <span className="rounded-full bg-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
              Đã kích hoạt
            </span>
          </div>
          <p className="mt-2 text-xs text-emerald-700">
            Lần đổi mật khẩu gần nhất: {profileForm.lastPasswordChangedAt}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--ink-800)]">Phiên đăng nhập đang hoạt động</p>
          {activeSessions.map((session) => (
            <article
              key={session.id}
              className="flex flex-col gap-2 rounded-2xl border border-[var(--line-soft)] bg-[var(--bg-soft)] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-900)]">
                  <UserCircle2 size={15} /> {session.device}
                </p>
                <p className="text-xs text-[var(--ink-600)]">
                  {session.location} • {session.ipAddress}
                </p>
              </div>
              <div className="text-xs text-[var(--ink-600)] md:text-right">
                <p className="font-semibold text-[var(--ink-800)]">{session.status}</p>
                <p>{session.lastSeen}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[var(--line-soft)] pt-4">
          <Button
            type="button"
            variant="soft"
            size="md"
            leftIcon={<KeyRound size={15} />}
            onClick={() => setIsChangePasswordOpen(true)}
          >
            Đổi mật khẩu
          </Button>
          <Button type="button" variant="danger" size="md" leftIcon={<LogOut size={15} />}>
            Đăng xuất khỏi tất cả thiết bị
          </Button>
          <Button type="button" variant="danger" size="md" leftIcon={<AlertTriangle size={16} />}>
            Khóa tài khoản khẩn cấp
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 text-xs text-[var(--ink-700)] md:grid-cols-3">
          <p className="inline-flex items-center gap-2 rounded-xl bg-[var(--bg-soft)] p-3">
            <CalendarDays size={13} /> Lần đăng nhập cuối: {profileForm.latestLogin}
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl bg-[var(--bg-soft)] p-3">
            <MapPin size={13} /> Vị trí: {profileForm.address}
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl bg-[var(--bg-soft)] p-3">
            <Monitor size={13} /> Thiết bị: {profileForm.device}
          </p>
        </div>
      </Card>

      <ChangePasswordModal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

    </div>
  );
}
