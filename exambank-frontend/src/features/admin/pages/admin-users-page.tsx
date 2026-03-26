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
import { Button } from "@/components/ui/Button/button";
import { Input } from "@/components/ui/Input/input";
import { Pagination } from "@/components/ui/Pagination/pagination";
import { StatCard } from "@/components/ui/StatCard/stat-card";

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
  role: "Sinh viên" | "Giảng viên" | "Cộng tác viên";
  joinedAt: string;
  lastActive: string;
  status: "Đang hoạt động" | "Chờ duyệt" | "Đã khóa";
};

const stats: StatCard[] = [
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

const users: UserRow[] = [
  {
    name: "Nguyễn Văn An",
    email: "an.nv@scholarly.vn",
    id: "#10234",
    role: "Sinh viên",
    joinedAt: "12/05/2024",
    lastActive: "2 giờ trước",
    status: "Đang hoạt động",
  },
  {
    name: "Lê Thị Mai",
    email: "mai.lt@scholarly.vn",
    id: "#09876",
    role: "Giảng viên",
    joinedAt: "10/04/2024",
    lastActive: "Hôm qua",
    status: "Đang hoạt động",
  },
  {
    name: "Trần Minh Quân",
    email: "quan.tm@scholarly.vn",
    id: "#11552",
    role: "Cộng tác viên",
    joinedAt: "01/06/2024",
    lastActive: "5 ngày trước",
    status: "Chờ duyệt",
  },
  {
    name: "Phạm Hoàng Long",
    email: "long.ph@scholarly.vn",
    id: "#10554",
    role: "Sinh viên",
    joinedAt: "15/03/2024",
    lastActive: "12/05/2024",
    status: "Đã khóa",
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

export default function AdminUsersPage() {
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
        >
          Thêm người dùng mới
        </Button>
      </section>

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
            <select className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]">
              <option>Tất cả vai trò</option>
              <option>Sinh viên</option>
              <option>Giảng viên</option>
              <option>Cộng tác viên</option>
              <option>Admin</option>
            </select>
            <select className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]">
              <option>Tất cả trạng thái</option>
              <option>Đang hoạt động</option>
              <option>Đã khóa</option>
              <option>Chờ duyệt</option>
            </select>
            <Button type="button" variant="icon" size="icon" className="h-11 w-11 rounded-xl">
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
              {users.map((user) => {
                const status = statusClasses(user.status);

                return (
                  <tr
                    key={user.id}
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
              })}
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
