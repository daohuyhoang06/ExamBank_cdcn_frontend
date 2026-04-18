import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button/button';
import { Input } from '@/components/ui/Input/input';
import { authService } from '@/features/auth/services/auth.service';
import { extractApiErrorMessage } from '@/lib/error-utils';

const MailIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[var(--ink-500)]" aria-hidden="true">
    <path
      d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm0 2v.2l8 5.2 8-5.2V8l-8 5-8-5Z"
      fill="currentColor"
    />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[var(--ink-500)]" aria-hidden="true">
    <path
      d="M17 10h-1V8a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V8Zm2 8.75a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z"
      fill="currentColor"
    />
  </svg>
);

const BookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" aria-hidden="true">
    <path
      d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v16.5a2.5 2.5 0 0 0-2.5-2.5H5V4.5Zm0 13h12.5A4.5 4.5 0 0 1 20 18.2V20H7.5A2.5 2.5 0 0 1 5 17.5Zm2-11v7h10V4H7Zm-2 0v9.3c.4-.2.9-.3 1.5-.3H6V4.3c-.6 0-1.1.1-1.5.3Z"
      fill="currentColor"
    />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-white/85" aria-hidden="true">
    <path
      d="M12 2 4.5 5v6c0 5.3 3.4 10.2 7.5 11 4.1-.8 7.5-5.7 7.5-11V5L12 2Zm0 2.2 5.5 2.2v4.6c0 4.3-2.7 8.4-5.5 9.1-2.8-.7-5.5-4.8-5.5-9.1V6.4L12 4.2Z"
      fill="currentColor"
    />
  </svg>
);

const GoogleIcon = () => (
  <span className="inline-flex items-center justify-center" aria-hidden="true">
    <svg viewBox="0 0 48 48" width="24" height="24">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  </span>
);

const FacebookIcon = () => (
  <span className="inline-flex items-center justify-center" aria-hidden="true">
    <svg viewBox="0 0 48 48" width="24" height="24">
      <path
        fill="#039BE5"
        d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z"
      />
      <path
        fill="#fff"
        d="M26.707 29.301h5.176l.813-5.258h-5.989v-2.855c0-1.984.582-3.233 3.471-3.233h3.139V13.27c-.542-.075-2.403-.235-4.571-.235-4.52 0-7.615 2.741-7.615 7.828V24.04h-4.347v5.261h4.347V42.52c.941.148 1.901.223 2.876.223.945 0 1.874-.071 2.779-.21V29.301z"
      />
    </svg>
  </span>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getApiErrorMessage = (error: unknown) => {
    return extractApiErrorMessage(error, 'Đăng nhập thất bại, vui lòng thử lại.');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    const normalizedEmail = email.trim();
    let isValid = true;

    if (!normalizedEmail) {
      setEmailError('Vui lòng nhập email.');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!password.trim()) {
      setPasswordError('Vui lòng nhập mật khẩu.');
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authService.login({
        email: normalizedEmail,
        password,
        rememberMe,
      });

      const normalizedRoles = [result.user?.role, ...(result.user?.roles ?? [])]
        .filter((role): role is string => Boolean(role))
        .map((role) => role.toUpperCase().replace("ROLE_", ""));

      if (normalizedRoles.includes("ADMIN")) {
        navigate('/admin', { replace: true });
        return;
      }

      if (normalizedRoles.includes("MODERATOR")) {
        navigate('/moderator', { replace: true });
        return;
      }

      navigate('/user', { replace: true });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const heroCardStyle = {
    marginTop: '2.5rem',
    maxWidth: '60rem',
    borderRadius: '1.875rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'linear-gradient(135deg, rgba(12, 36, 72, 0.68), rgba(8, 26, 52, 0.46))',
    padding: '2rem 1.75rem',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 20px 60px rgba(0, 0, 0, 0.32)',
    backdropFilter: 'blur(14px)',
  } as const;

  const heroTitleStyle = {
    maxWidth: '48.75rem',
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'clamp(1.85rem, 4.8vw, 4.2rem)',
    fontWeight: 900,
    lineHeight: 1.08,
    letterSpacing: '-0.035em',
    color: '#ffffff',
    textShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  } as const;

  const heroDescStyle = {
    maxWidth: '38.75rem',
    marginTop: '1.5rem',
    color: 'rgba(255, 255, 255, 0.84)',
    fontSize: '1rem',
    lineHeight: 1.8,
  } as const;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-page)] px-4 py-5 sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute -left-24 top-[-120px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(31,99,180,0.28),transparent_70%)]" />
      <div className="pointer-events-none absolute -right-28 bottom-[-160px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(15,138,92,0.2),transparent_68%)]" />

      <div className="relative mx-auto grid w-full max-w-[1320px] gap-6 lg:grid-cols-12">
        <section className="order-2 rounded-[28px] border border-[var(--line-soft)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)] sm:p-8 lg:order-1 lg:col-span-5" aria-label="Biểu mẫu đăng nhập">
          <div className="mb-8 space-y-5 sm:mb-10">
            <h1 className="text-[2rem] font-extrabold leading-[1.1] text-[var(--ink-900)] sm:text-[2.4rem]">Chào mừng trở lại</h1>
            <p className="text-[1.02rem] leading-[1.6] text-[var(--ink-600)]">Tiếp tục lộ trình học tập cùng cộng đồng.</p>
          </div>

          <form className="flex flex-col gap-[18px]" noValidate onSubmit={handleSubmit}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              label="EMAIL"
              placeholder="name@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={emailError}
              startAdornment={<MailIcon />}
              containerClassName="gap-2.5"
              labelClassName="font-extrabold tracking-[0.16em]"
              inputWrapperClassName="h-[58px]"
              inputClassName="h-[58px]"
            />

            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              label="MẬT KHẨU"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={passwordError}
              startAdornment={<LockIcon />}
              containerClassName="gap-2.5"
              labelClassName="font-extrabold tracking-[0.16em]"
              inputWrapperClassName="h-[58px]"
              inputClassName="h-[58px]"
            />

            <div className="mt-1 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-[0.95rem] text-[var(--ink-700)]">
                <input
                  className="h-[17px] w-[17px] accent-[var(--brand-600)]"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Giữ đăng nhập</span>
              </label>

              <Button type="button" variant="ghost" size="sm" className="h-auto rounded-sm border-none p-0 text-[0.95rem] font-semibold text-[var(--brand-700)]">
                Quên mật khẩu?
              </Button>
            </div>

            {submitError ? (
              <p className="text-sm font-semibold" style={{ color: 'var(--error)' }}>
                {submitError}
              </p>
            ) : null}

            <Button type="submit" variant="primary" size="xl" fullWidth className="h-[60px] rounded-2xl text-[1.2rem]" disabled={isSubmitting}>
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>

            <div className="mt-1 flex items-center gap-4">
              <span className="h-px flex-1 bg-[var(--line-soft)]" />
              <p className="font-[var(--font-label)] whitespace-nowrap text-[0.78rem] font-bold tracking-[0.18em] text-[var(--ink-500)]">ĐĂNG NHẬP BẰNG</p>
              <span className="h-px flex-1 bg-[var(--line-soft)]" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button type="button" variant="secondary" size="lg" className="h-[54px] gap-3 rounded-[var(--radius-field)] border-[var(--line-soft)] bg-[var(--bg-panel)] text-base text-[var(--ink-900)] hover:bg-[var(--bg-soft)]">
                <GoogleIcon />
                <span>Google</span>
              </Button>

              <Button type="button" variant="secondary" size="lg" className="h-[54px] gap-3 rounded-[var(--radius-field)] border-[var(--line-soft)] bg-[var(--bg-panel)] text-base text-[var(--ink-900)] hover:bg-[var(--bg-soft)]">
                <FacebookIcon />
                <span>Facebook</span>
              </Button>
            </div>

            <p className="mt-2 text-center text-[0.98rem] text-[var(--ink-600)]">
              Chưa có tài khoản?{' '}
              <Link className="rounded-sm font-bold text-[var(--brand-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2" to="/register">Đăng ký ngay</Link>
            </p>
          </form>
        </section>

        <section className="order-1 relative min-h-[480px] overflow-hidden rounded-[32px] border border-white/20 bg-[linear-gradient(rgba(6,24,52,0.58),rgba(4,18,40,0.8)),url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center p-6 text-white shadow-[0_24px_44px_rgba(6,22,47,0.3)] sm:p-8 lg:order-2 lg:col-span-7 lg:min-h-[760px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(146,204,255,0.18),transparent_42%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,22,48,0.08)_0%,rgba(4,22,48,0.4)_100%)]" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/20 bg-[rgba(255,255,255,0.12)] px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.16)] backdrop-blur-md">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white">
                <BookIcon />
              </span>
              <p className="font-[var(--font-label)] text-sm font-bold tracking-[0.14em] text-white">
                Scholarly Sanctuary
              </p>
            </div>

            <div style={heroCardStyle} className="sm:px-9 sm:py-10 lg:mt-12 lg:px-10 lg:py-12">
              <h2 style={heroTitleStyle}>
                Mở khóa tiềm năng,
                <br />
                chinh phục đỉnh cao
                <br />
                tri thức
              </h2>

              <p style={heroDescStyle} className="sm:text-[1.06rem]">
                Gia nhập cộng đồng học giả hàng đầu để tiếp cận tài liệu chất lượng,
                lộ trình cá nhân hóa và phương pháp học tập hiện đại.
              </p>
            </div>

            <div className="mt-auto grid gap-3 pt-4 sm:pt-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/25 bg-[rgba(8,20,42,0.52)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-md">
                <p className="font-[var(--font-label)] text-xs font-bold tracking-[0.18em] text-[rgba(255,255,255,0.76)]">
                  TỈ LỆ HOÀN THÀNH
                </p>
                <p className="mt-2 text-3xl font-extrabold text-white">92%</p>
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.84)]">
                  Bài luyện đã được theo dõi tự động
                </p>
              </div>

              <div className="rounded-2xl border border-white/25 bg-[rgba(8,20,42,0.52)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-md">
                <div className="inline-flex items-center gap-2 text-white">
                  <ShieldIcon />
                  <p className="font-[var(--font-label)] text-xs font-bold tracking-[0.18em]">
                    BẢO MẬT
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[rgba(255,255,255,0.84)]">
                  Dữ liệu cá nhân và lịch sử học tập được mã hóa và đồng bộ an toàn trên mọi thiết bị.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}