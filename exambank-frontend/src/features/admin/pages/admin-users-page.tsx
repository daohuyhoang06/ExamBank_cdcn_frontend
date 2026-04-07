import {
  Ban,
  Bolt,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Shield,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { isAxiosError } from "axios";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button/button";
import { Input } from "@/components/ui/Input/input";
import { Modal } from "@/components/ui/Modal/modal";
import { Pagination } from "@/components/ui/Pagination/pagination";
import { StatCard } from "@/components/ui/StatCard/stat-card";
import {
  createAdminUser,
  getAdminUsers,
  getAdminUsersPageCardMetrics,
} from "@/features/admin/services/admin-users.service";
import type {
  AdminCreateUserPayload,
  AdminUserRecord,
  AdminUserRoleCode,
  AdminUserStatusCode,
} from "@/features/admin/types/admin-users.type";

type StatCard = {
  title: string;
  value: string;
  trend: string;
  icon: typeof Users;
  tone: "primary" | "success" | "warning" | "danger";
};

type UserRow = {
  name: string;
  email: string;
  id: string;
  role: "Sinh viên" | "Giảng viên" | "Cộng tác viên" | "Quản trị viên";
  joinedAt: string;
  lastActive: string;
  status: "Đang hoạt động" | "Chờ duyệt" | "Đã khóa";
};

type RoleFilterValue = "ALL" | UserRow["role"];
type StatusFilterValue = "ALL" | UserRow["status"];

type CreateUserFormState = {
  name: string;
  email: string;
  password: string;
  roleCode: AdminUserRoleCode;
  status: AdminUserStatusCode;
};

type CreateUserFormErrors = {
  name?: string;
  email?: string;
  password?: string;
};

const defaultCreateUserForm: CreateUserFormState = {
  name: "",
  email: "",
  password: "",
  roleCode: "USER",
  status: "ACTIVE",
};

const defaultStats: StatCard[] = [
  {
    title: "Tổng người dùng",
    value: "25,432",
    trend: "+12.5%",
    icon: Users,
    tone: "primary",
  },
  {
    title: "Mới hôm nay",
    value: "+124",
    trend: "+5%",
    icon: TrendingUp,
    tone: "success",
  },
  {
    title: "Đang hoạt động",
    value: "1,203",
    trend: "Ổn định",
    icon: Bolt,
    tone: "warning",
  },
  {
    title: "Người dùng bị khóa",
    value: "45",
    trend: "-2%",
    icon: Ban,
    tone: "danger",
  },
];

function statToneClasses(tone: StatCard["tone"]) {
  if (tone === "success") {
    return {
      border: "border-emerald-200",
      iconWrap: "bg-emerald-50 text-emerald-700",
      trend: "bg-emerald-100 text-emerald-700",
    };
  }

  if (tone === "warning") {
    return {
      border: "border-amber-200",
      iconWrap: "bg-amber-50 text-amber-700",
      trend: "bg-amber-100 text-amber-700",
    };
  }

  if (tone === "danger") {
    return {
      border: "border-rose-200",
      iconWrap: "bg-rose-50 text-rose-700",
      trend: "bg-rose-100 text-rose-700",
    };
  }

  return {
    border: "border-blue-200",
    iconWrap: "bg-[var(--brand-050)] text-[var(--brand-700)]",
    trend: "bg-[var(--brand-100)] text-[var(--brand-700)]",
  };
}

function roleClasses(role: UserRow["role"]) {
  if (role === "Quản trị viên") {
    return "bg-slate-100 text-slate-700";
  }

  if (role === "Giảng viên") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (role === "Cộng tác viên") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-[var(--brand-100)] text-[var(--brand-700)]";
}

function statusClasses(status: UserRow["status"]) {
  if (status === "Đã khóa") {
    return {
      dot: "bg-rose-500",
      text: "text-rose-700",
    };
  }

  if (status === "Chờ duyệt") {
    return {
      dot: "bg-amber-500",
      text: "text-amber-700",
    };
  }

  return {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  };
}

function normalizeRole(primaryRole?: string, roles?: string[]): UserRow["role"] {
  const roleCodes = [primaryRole, ...(roles ?? [])]
    .filter((role): role is string => Boolean(role))
    .map((role) => role.toUpperCase().replace("ROLE_", ""));

  if (roleCodes.includes("ADMIN")) {
    return "Quản trị viên";
  }

  if (roleCodes.includes("MODERATOR")) {
    return "Cộng tác viên";
  }

  if (roleCodes.includes("TEACHER") || roleCodes.includes("LECTURER")) {
    return "Giảng viên";
  }

  return "Sinh viên";
}

function normalizeStatus(status?: string): UserRow["status"] {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "ACTIVE") {
    return "Đang hoạt động";
  }

  if (normalized === "BANNED" || normalized === "LOCKED") {
    return "Đã khóa";
  }

  return "Chờ duyệt";
}

function formatDisplayDate(value?: string) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN").format(date);
}

function mapUsersToRows(items: AdminUserRecord[]): UserRow[] {
  return items.map((item, index) => {
    const email = item.email?.trim() ?? "";
    const fallbackName = email ? email.split("@")[0] : `User ${index + 1}`;

    return {
      name: item.name?.trim() || fallbackName,
      email: email || "--",
      id: item.id != null ? `#${item.id}` : "--",
      role: normalizeRole(item.primaryRole, item.roles),
      joinedAt: formatDisplayDate(item.createdAt),
      lastActive: "--",
      status: normalizeStatus(item.status),
    };
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
}

function buildStats(metrics: {
  totalUsers: number;
  newUsersToday: number;
  activeUsers: number;
  lockedUsers: number;
}): StatCard[] {
  const totalUsers = metrics.totalUsers;
  const safePercent = (part: number) => (totalUsers > 0 ? (part / totalUsers) * 100 : 0);

  return [
    {
      ...defaultStats[0],
      value: formatNumber(metrics.totalUsers),
      trend: `Mới hôm nay +${formatNumber(metrics.newUsersToday)}`,
    },
    {
      ...defaultStats[1],
      value: `+${formatNumber(metrics.newUsersToday)}`,
      trend: `${formatPercent(safePercent(metrics.newUsersToday))}% tổng user`,
    },
    {
      ...defaultStats[2],
      value: formatNumber(metrics.activeUsers),
      trend: `${formatPercent(safePercent(metrics.activeUsers))}% tổng user`,
    },
    {
      ...defaultStats[3],
      value: formatNumber(metrics.lockedUsers),
      trend: `${formatPercent(safePercent(metrics.lockedUsers))}% tổng user`,
    },
  ];
}

function getApiErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string; error?: string } | undefined;
    return responseData?.message ?? responseData?.error ?? "Tạo người dùng thất bại.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Tạo người dùng thất bại.";
}

export default function AdminUsersPage() {
  const [stats, setStats] = useState<StatCard[]>(defaultStats);
  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserFormState>(defaultCreateUserForm);
  const [createUserErrors, setCreateUserErrors] = useState<CreateUserFormErrors>({});
  const [createUserSubmitError, setCreateUserSubmitError] = useState("");

  async function loadUsersPageData() {
    const [metrics, users] = await Promise.all([
      getAdminUsersPageCardMetrics(),
      getAdminUsers(),
    ]);

    setStats(buildStats(metrics));
    setUserRows(mapUsersToRows(users));
  }

  function resetCreateUserForm() {
    setCreateUserForm(defaultCreateUserForm);
    setCreateUserErrors({});
    setCreateUserSubmitError("");
  }

  function openCreateUserModal() {
    resetCreateUserForm();
    setIsCreateModalOpen(true);
  }

  function closeCreateUserModal() {
    if (isCreatingUser) {
      return;
    }
    setIsCreateModalOpen(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [metrics, users] = await Promise.all([
          getAdminUsersPageCardMetrics(),
          getAdminUsers(),
        ]);

        if (!isMounted) {
          return;
        }

        setStats(buildStats(metrics));
        setUserRows(mapUsersToRows(users));
      } catch {
        if (!isMounted) {
          return;
        }
        setStats(defaultStats);
        setUserRows([]);
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  function setCreateUserField<K extends keyof CreateUserFormState>(field: K, value: CreateUserFormState[K]) {
    setCreateUserForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setCreateUserErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  }

  function validateCreateUserForm(): AdminCreateUserPayload | null {
    const nextErrors: CreateUserFormErrors = {};
    const name = createUserForm.name.trim();
    const email = createUserForm.email.trim();
    const password = createUserForm.password.trim();

    if (!name) {
      nextErrors.name = "Vui lòng nhập họ và tên.";
    }

    if (!email) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = "Email không hợp lệ.";
    }

    if (!password) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (password.length < 8) {
      nextErrors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    }

    setCreateUserErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    return {
      name,
      email,
      password,
      roleCode: createUserForm.roleCode,
      status: createUserForm.status,
    };
  }

  async function handleCreateUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateUserSubmitError("");

    const payload = validateCreateUserForm();
    if (!payload) {
      return;
    }

    setIsCreatingUser(true);

    try {
      await createAdminUser(payload);
      await loadUsersPageData();
      setIsCreateModalOpen(false);
      resetCreateUserForm();
    } catch (error) {
      setCreateUserSubmitError(getApiErrorMessage(error));
    } finally {
      setIsCreatingUser(false);
    }
  }

  const filteredRows = userRows.filter((user) => {
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || user.status === statusFilter;
    return matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-[var(--font-label)] text-3xl font-extrabold tracking-tight text-[var(--ink-900)]">
            Quản lý người dùng
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-600)]">
            Quản lý và giám sát hệ thống học viên và giảng viên của bạn.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="lg"
          leftIcon={<Plus size={16} />}
          className="rounded-xl"
          onClick={openCreateUserModal}
        >
          Thêm người dùng mới
        </Button>
      </section>

      <Modal open={isCreateModalOpen} onClose={closeCreateUserModal}>
        <form className="space-y-5" onSubmit={handleCreateUserSubmit}>
          <div className="rounded-2xl border border-[var(--brand-100)] bg-[linear-gradient(145deg,var(--brand-050)_0%,#ffffff_72%)] px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-700)] text-white shadow-[var(--shadow-brand)]">
                <Plus size={16} />
              </span>
              <div>
                <h2 className="font-[var(--font-label)] text-2xl font-black tracking-tight text-[var(--brand-700)]">
                  Thêm người dùng mới
                </h2>
                <p className="mt-1 text-sm text-[var(--ink-600)]">
                  Tạo tài khoản người dùng trực tiếp từ trang quản trị.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="HỌ VÀ TÊN"
              value={createUserForm.name}
              onChange={(event) => setCreateUserField("name", event.target.value)}
              error={createUserErrors.name}
              placeholder="Nguyễn Văn A"
              autoComplete="name"
              containerClassName="gap-2.5"
            />

            <Input
              type="email"
              label="EMAIL"
              value={createUserForm.email}
              onChange={(event) => setCreateUserField("email", event.target.value)}
              error={createUserErrors.email}
              placeholder="name@example.com"
              autoComplete="email"
              containerClassName="gap-2.5"
            />
          </div>

          <Input
            type="password"
            label="MẬT KHẨU"
            value={createUserForm.password}
            onChange={(event) => setCreateUserField("password", event.target.value)}
            error={createUserErrors.password}
            hint="Mật khẩu tối thiểu 8 ký tự"
            placeholder="Nhập mật khẩu"
            autoComplete="new-password"
            containerClassName="gap-2.5"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="font-[var(--font-label)] text-[0.82rem] font-bold tracking-[0.12em] text-[var(--ink-600)]">
                VAI TRÒ
              </label>
              <select
                value={createUserForm.roleCode}
                onChange={(event) =>
                  setCreateUserField("roleCode", event.target.value as AdminUserRoleCode)
                }
                className="h-12 rounded-xl border border-[var(--line-soft)] bg-[var(--bg-soft)] px-3.5 text-sm text-[var(--ink-900)] outline-none transition focus:border-[var(--brand-500)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)]"
              >
                <option value="USER">Sinh viên</option>
                <option value="MODERATOR">Cộng tác viên</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
              <p className="text-xs text-[var(--ink-500)]">Vai trò sẽ quyết định quyền truy cập hệ thống.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-[var(--font-label)] text-[0.82rem] font-bold tracking-[0.12em] text-[var(--ink-600)]">
                TRẠNG THÁI
              </label>
              <select
                value={createUserForm.status}
                onChange={(event) =>
                  setCreateUserField("status", event.target.value as AdminUserStatusCode)
                }
                className="h-12 rounded-xl border border-[var(--line-soft)] bg-[var(--bg-soft)] px-3.5 text-sm text-[var(--ink-900)] outline-none transition focus:border-[var(--brand-500)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)]"
              >
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Chờ duyệt</option>
                <option value="BANNED">Đã khóa</option>
              </select>
              <p className="text-xs text-[var(--ink-500)]">Bạn có thể thay đổi trạng thái sau khi tạo tài khoản.</p>
            </div>
          </div>

          {createUserSubmitError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {createUserSubmitError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-[var(--line-soft)] pt-4">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={closeCreateUserModal}
              disabled={isCreatingUser}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Plus size={14} />}
              disabled={isCreatingUser}
            >
              {isCreatingUser ? "Đang tạo..." : "Tạo người dùng"}
            </Button>
          </div>
        </form>
      </Modal>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const tone = statToneClasses(item.tone);
          const Icon = item.icon;

          return (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              icon={<Icon size={19} />}
              badge={item.trend}
              cardClassName={`border ${tone.border}`}
              iconWrapClassName={`h-11 w-11 ${tone.iconWrap}`}
              badgeClassName={tone.trend}
              valueClassName="font-bold text-[var(--ink-900)]"
            />
          );
        })}
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 border-b border-[var(--line-soft)] bg-[var(--bg-soft)] p-5 lg:flex-row lg:items-center lg:justify-between">
          <Input
            type="text"
            placeholder="Tìm kiếm tên, email, ID..."
            startAdornment={<Search size={16} className="text-[var(--ink-500)]" />}
            containerClassName="w-full lg:max-w-md"
            inputWrapperClassName="h-11"
            inputClassName="h-11 text-sm"
          />

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as RoleFilterValue)}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="Sinh viên">Sinh viên</option>
              <option value="Giảng viên">Giảng viên</option>
              <option value="Cộng tác viên">Cộng tác viên</option>
              <option value="Quản trị viên">Quản trị viên</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilterValue)}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Đang hoạt động">Đang hoạt động</option>
              <option value="Đã khóa">Đã khóa</option>
              <option value="Chờ duyệt">Chờ duyệt</option>
            </select>
            <Button
              type="button"
              variant="icon"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={() => {
                setRoleFilter("ALL");
                setStatusFilter("ALL");
              }}
            >
              <Filter size={16} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead>
              <tr className="border-b border-[var(--line-soft)] bg-[var(--bg-soft)] text-xs uppercase tracking-[0.1em] text-[var(--ink-600)]">
                <th className="px-6 py-4 font-semibold">Người dùng</th>
                <th className="px-4 py-4 font-semibold">ID</th>
                <th className="px-4 py-4 font-semibold">Vai trò</th>
                <th className="px-4 py-4 font-semibold">Ngày tham gia</th>
                <th className="px-4 py-4 font-semibold">Hoạt động cuối</th>
                <th className="px-4 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-[var(--ink-500)]" colSpan={7}>
                    {userRows.length === 0
                      ? "Chưa có dữ liệu người dùng."
                      : "Không có người dùng phù hợp bộ lọc hiện tại."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((user) => {
                  const status = statusClasses(user.status);

                  return (
                    <tr
                      key={`${user.id}-${user.email}`}
                      className="border-b border-[var(--line-soft)]/70 transition hover:bg-[var(--brand-050)]/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-100)] text-[var(--brand-700)]">
                            <UserRound size={16} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[var(--ink-900)]">
                              {user.name}
                            </p>
                            <p className="text-xs text-[var(--ink-600)]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--ink-600)]">{user.id}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] ${roleClasses(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--ink-600)]">
                        {user.joinedAt}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--ink-600)]">
                        {user.lastActive}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                          <span className={`text-xs font-semibold ${status.text}`}>
                            {user.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-500)] transition hover:bg-[var(--bg-soft)]"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--line-soft)] bg-[var(--bg-soft)] p-5 sm:flex-row">
          <p className="text-sm text-[var(--ink-600)]">Trang 1 / 150</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled
              leftIcon={<ChevronLeft size={16} />}
              className="rounded-lg px-3 py-2 text-[var(--ink-500)]"
            >
              Trước
            </Button>
            <Pagination currentPage={1} totalPages={150} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              rightIcon={<ChevronRight size={16} />}
              className="rounded-lg px-3 py-2 text-[var(--brand-700)] transition hover:bg-white"
            >
              Tiếp
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <article className="rounded-3xl border border-[var(--brand-100)] bg-[linear-gradient(150deg,#f2f7ff_0%,#ffffff_100%)] p-7">
          <h2 className="font-[var(--font-label)] text-xl font-bold text-[var(--brand-700)]">
            Mẹo quản trị viên
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ink-600)]">
            Bạn có thể quản lý hàng loạt người dùng bằng cách chọn nhiều bản ghi
            trong bảng, sau đó áp dụng các thao tác như gửi thông báo, đổi vai
            trò hoặc tạm khóa tài khoản.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--brand-700)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.09em] text-white">
            <CircleHelp size={13} />
            Đội ngũ hỗ trợ khả dụng
          </div>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-amber-100 bg-amber-50 p-7">
          <Shield
            size={86}
            className="pointer-events-none absolute -bottom-5 -right-3 text-amber-200"
          />
          <h2 className="font-[var(--font-label)] text-xl font-bold text-amber-900">
            Bảo mật
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-amber-900/85">
            Tất cả thay đổi trạng thái người dùng đều được ghi lại trong nhật ký
            hệ thống. Hãy đảm bảo các thao tác quản trị tuân thủ chính sách bảo
            mật nội bộ.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-900 transition hover:underline"
          >
            Xem nhật ký thay đổi
            <ChevronRight size={16} />
          </button>
        </article>
      </section>
    </div>
  );
}
