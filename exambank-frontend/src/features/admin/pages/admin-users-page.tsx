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
      iconWrap: "bg-emerald-50 text-emerald-700",
      trend: "bg-emerald-100 text-emerald-700",
    };
  }

  if (tone === "warning") {
    return {
      iconWrap: "bg-amber-50 text-amber-700",
      trend: "bg-amber-100 text-amber-700",
    };
  }

  if (tone === "danger") {
    return {
      iconWrap: "bg-rose-50 text-rose-700",
      trend: "bg-rose-100 text-rose-700",
    };
  }

  return {
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
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--brand-600),var(--brand-700))] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition duration-200 hover:brightness-105"
        >
          <Plus size={16} />
          Thêm người dùng mới
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const tone = statToneClasses(item.tone);
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              className="rounded-2xl border border-[var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${tone.iconWrap}`}
                >
                  <Icon size={19} />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.trend}`}
                >
                  {item.trend}
                </span>
              </div>
              <p className="mt-4 text-sm text-[var(--ink-600)]">{item.title}</p>
              <p className="mt-1 text-3xl font-bold leading-none text-[var(--ink-900)]">
                {item.value}
              </p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 border-b border-[var(--line-soft)] bg-[var(--bg-soft)] p-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative w-full lg:max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-500)]"
            />
            <input
              type="text"
              placeholder="Tìm kiếm tên, email, ID..."
              className="w-full rounded-xl border border-[var(--line-soft)] bg-white py-2.5 pl-9 pr-4 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            />
          </label>

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
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--line-soft)] bg-white text-[var(--ink-600)] transition hover:bg-[var(--bg-soft)]"
            >
              <Filter size={16} />
            </button>
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
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--ink-500)] opacity-50"
            >
              <ChevronLeft size={16} />
              Trước
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="h-8 w-8 rounded-lg bg-[var(--brand-700)] text-xs font-semibold text-white"
              >
                1
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-lg text-xs font-semibold text-[var(--ink-700)] transition hover:bg-white"
              >
                2
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-lg text-xs font-semibold text-[var(--ink-700)] transition hover:bg-white"
              >
                3
              </button>
              <span className="px-1 text-sm text-[var(--ink-500)]">...</span>
              <button
                type="button"
                className="h-8 w-8 rounded-lg text-xs font-semibold text-[var(--ink-700)] transition hover:bg-white"
              >
                150
              </button>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--brand-700)] transition hover:bg-white"
            >
              Tiếp
              <ChevronRight size={16} />
            </button>
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
