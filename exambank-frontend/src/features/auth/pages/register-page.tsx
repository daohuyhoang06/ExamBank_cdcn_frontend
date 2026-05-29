import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button/button';
import { Input } from '@/components/ui/Input/input';
import { authService } from '@/features/auth/services/auth.service';
import { extractApiErrorMessage } from '@/lib/error-utils';

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="M12 2.5 13.7 7l4.8 1.7-4.8 1.7L12 15l-1.7-4.6L5.5 8.7 10.3 7 12 2.5Zm7.2 10.8 1 2.7 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1 1-2.7ZM5 14l1 2.4 2.4 1-2.4 1L5 20.8l-1-2.4-2.4-1 2.4-1L5 14Z"
      fill="currentColor"
    />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
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
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
    <path
      fill="#039BE5"
      d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z"
    />
    <path
      fill="#fff"
      d="M26.707 29.301h5.176l.813-5.258h-5.989v-2.855c0-1.984.582-3.233 3.471-3.233h3.139V13.27c-.542-.075-2.403-.235-4.571-.235-4.52 0-7.615 2.741-7.615 7.828V24.04h-4.347v5.261h4.347V42.52c.941.148 1.901.223 2.876.223.945 0 1.874-.071 2.779-.21V29.301z"
    />
  </svg>
);

const CapIcon = () => (
  <svg viewBox="0 0 64 64" className="pointer-events-none absolute -bottom-8 -right-2 w-24 text-gray-300 opacity-60" aria-hidden="true">
    <path
      d="M32 13 6 25l26 12 21-9.7V44h6V25L32 13Zm-16.7 19 16.7 7.7L48.7 32v7.4L32 47 15.3 39.4V32Z"
      fill="currentColor"
    />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="M12 5c4.8 0 8.7 2.8 10.6 7-1.9 4.2-5.8 7-10.6 7S3.3 16.2 1.4 12C3.3 7.8 7.2 5 12 5Zm0 2C8.4 7 5.3 9 3.6 12 5.3 15 8.4 17 12 17s6.7-2 8.4-5C18.7 9 15.6 7 12 7Zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z"
      fill="currentColor"
    />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="m3.2 2 18.8 18.8-1.4 1.4-3.2-3.2a11.6 11.6 0 0 1-5.4 1.3c-4.8 0-8.8-2.8-10.6-7a12.4 12.4 0 0 1 4.4-5.2L1.8 3.4 3.2 2Zm15.9 13a10.8 10.8 0 0 0 1.4-2.9C18.7 9 15.6 7 12 7c-1 0-2 .2-2.9.5l1.7 1.7c.4-.2.8-.3 1.2-.3a2.8 2.8 0 0 1 2.8 2.8c0 .4-.1.8-.3 1.2l2.6 2.1Zm-6.4 1.8-2-2a2.8 2.8 0 0 1-1.5-4.8L7 7.8C5.5 8.8 4.3 10.2 3.6 12 5.3 15 8.4 17 12 17c.7 0 1.4-.1 2.1-.2l-1.4-1.4Z"
      fill="currentColor"
    />
  </svg>
);

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAgree, setTermsAgree] = useState(false);

  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getApiErrorMessage = (error: unknown) => {
    return extractApiErrorMessage(error, 'Đăng ký thất bại, vui lòng thử lại.');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();
    let isValid = true;

    if (!normalizedFullName) {
      setFullNameError('Vui lòng nhập họ và tên.');
      isValid = false;
    } else {
      setFullNameError('');
    }

    if (!normalizedEmail) {
      setEmailError('Vui lòng nhập email.');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!normalizedPassword) {
      setPasswordError('Vui lòng nhập mật khẩu.');
      isValid = false;
    } else if (normalizedPassword.length < 8) {
      setPasswordError('Mật khẩu phải có ít nhất 8 ký tự.');
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (!normalizedConfirmPassword) {
      setConfirmPasswordError('Vui lòng xác nhận mật khẩu.');
      isValid = false;
    } else if (normalizedConfirmPassword !== normalizedPassword) {
      setConfirmPasswordError('Mật khẩu xác nhận không khớp.');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    if (!termsAgree) {
      setTermsError('Bạn cần đồng ý điều khoản trước khi đăng ký.');
      isValid = false;
    } else {
      setTermsError('');
    }

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.register({
        fullName: normalizedFullName,
        email: normalizedEmail,
        password: normalizedPassword,
        confirmPassword: normalizedConfirmPassword,
      });

      navigate('/login', { replace: true });
    } catch (error) {
      if ((error as { isAxiosError?: boolean })?.isAxiosError) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 400) {
          setEmailError('Email đã được sử dụng.');
          setSubmitError('');
          return;
        }
      }
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,#eef4ff_0%,#f6fbff_45%,#f2f9f4_100%)] px-4 py-5 sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute -right-16 top-[-100px] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(31,99,180,0.22),transparent_72%)]" />
      <div className="pointer-events-none absolute -left-20 bottom-[-140px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(15,138,92,0.2),transparent_68%)]" />

      <div className="relative mx-auto grid w-full max-w-[1320px] gap-6 lg:grid-cols-12">
        <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#0d366f_0%,#0b2f60_100%)] p-6 text-white shadow-[0_20px_40px_rgba(11,47,96,0.34)] sm:p-8 lg:col-span-4 lg:min-h-[760px]" aria-label="Thông tin lợi ích">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-[radial-gradient(circle_at_72%_12%,rgba(134,212,255,0.36),transparent_62%)]" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="mb-9 inline-flex w-fit items-center gap-2.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5">
              <SparklesIcon />
              <span className="font-[var(--font-label)] text-xs font-bold tracking-[0.18em]">NEW SCHOLAR</span>
            </div>

            <h1 className="mt-0 font-[var(--font-body)] text-[clamp(2rem,3.6vw,3.3rem)] font-extrabold leading-[1.16] tracking-[-0.03em] text-[rgba(255,255,255,0.98)]">
              Tạo tài khoản,
              <br />
              mở kho tri thức.
            </h1>

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/20">
              <img
                src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80"
                alt="Sinh viên đang học trong thư viện"
                className="h-[210px] w-full object-cover"
              />
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md">
                <p className="font-[var(--font-label)] text-[0.72rem] font-bold tracking-[0.2em] text-[#c8ffe5]">SMART TRACKING</p>
                <p className="mt-1 text-sm font-medium leading-6 text-white">Theo dõi tiến bộ theo chương, đề thi và từng kỹ năng nhỏ.</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md">
                <p className="font-[var(--font-label)] text-[0.72rem] font-bold tracking-[0.2em] text-[#c8ffe5]">RECOMMENDED PLAN</p>
                <p className="mt-1 text-sm font-medium leading-6 text-white">Lộ trình học được đề xuất tự động theo thời gian biểu của bạn.</p>
              </div>
            </div>

            <div className="mt-auto pt-7">
              <div className="inline-flex items-center gap-2 text-sm text-white/85">
                <span className="h-2.5 w-2.5 rounded-full bg-[#63f2bb]" />
                Hơn 14.000 học viên hoạt động mỗi tháng
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-8" aria-label="Biểu mẫu đăng ký">
          <div className="rounded-[30px] border border-[var(--line-soft)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)] sm:p-8 lg:p-10">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-[var(--font-label)] text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-600)]">Create Account</p>
                <h2 className="mt-5 font-[var(--font-body)] text-[2rem] font-extrabold leading-[1.12] text-[var(--ink-900)] sm:text-[2.6rem]">Bắt đầu hành trình của bạn</h2>
              </div>
            
            </div>

            <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <Input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  label="Họ và Tên"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    if (fullNameError) setFullNameError('');
                    if (submitError) setSubmitError('');
                  }}
                  error={fullNameError}
                  labelClassName="text-[0.96rem] font-semibold tracking-normal text-[var(--ink-900)]"
                />

                <Input
                  id="registerEmail"
                  type="email"
                  autoComplete="email"
                  required
                  label="Email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (emailError) setEmailError('');
                    if (submitError) setSubmitError('');
                  }}
                  error={emailError}
                  labelClassName="text-[0.96rem] font-semibold tracking-normal text-[var(--ink-900)]"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Input
                  id="registerPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  label="Mật khẩu"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (passwordError) setPasswordError('');
                    if (confirmPasswordError) setConfirmPasswordError('');
                    if (submitError) setSubmitError('');
                  }}
                  error={passwordError}
                  labelClassName="text-[0.96rem] font-semibold tracking-normal text-[var(--ink-900)]"
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-500)] transition hover:bg-[var(--line-soft)] hover:text-[var(--ink-700)]"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  }
                />

                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  label="Xác nhận mật khẩu"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (confirmPasswordError) setConfirmPasswordError('');
                    if (submitError) setSubmitError('');
                  }}
                  error={confirmPasswordError}
                  labelClassName="text-[0.96rem] font-semibold tracking-normal text-[var(--ink-900)]"
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-500)] transition hover:bg-[var(--line-soft)] hover:text-[var(--ink-700)]"
                      aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  }
                />
              </div>

              <label className="mt-0.5 inline-flex items-start gap-2.5 text-[0.94rem] leading-[1.5] text-[var(--ink-600)]" htmlFor="termsAgree">
                <input
                  className="mt-0.5 h-[14px] w-[14px] accent-[var(--brand-600)]"
                  id="termsAgree"
                  type="checkbox"
                  checked={termsAgree}
                  onChange={(event) => {
                    setTermsAgree(event.target.checked);
                    if (termsError) setTermsError('');
                    if (submitError) setSubmitError('');
                  }}
                />
                <span>
                  Tôi đồng ý với <Button className="h-auto rounded-sm border-none bg-transparent p-0 font-bold text-[var(--brand-700)]" type="button" size="sm" variant="ghost">Điều khoản</Button> và{' '}
                  <Button className="h-auto rounded-sm border-none bg-transparent p-0 font-bold text-[var(--brand-700)]" type="button" size="sm" variant="ghost">Chính sách bảo mật</Button>
                </span>
              </label>

              {termsError ? <p className="-mt-2 text-sm font-semibold text-rose-600">{termsError}</p> : null}

              {submitError ? (
                <p className="text-sm font-semibold" style={{ color: 'var(--error)' }}>
                  {submitError}
                </p>
              ) : null}

              <Button className="mt-1 h-[58px] text-[1.18rem]" type="submit" size="xl" variant="primary" fullWidth disabled={isSubmitting}>
                {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
              </Button>

              <div className="mt-1 flex items-center gap-4">
                <span className="h-px flex-1 bg-[var(--line-soft)]" />
                <p className="font-[var(--font-label)] whitespace-nowrap text-[0.74rem] font-semibold tracking-[0.2em] text-[var(--ink-500)]">HOẶC ĐĂNG KÝ VỚI</p>
                <span className="h-px flex-1 bg-[var(--line-soft)]" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="soft"
                  size="lg"
                  className="h-12 gap-2 rounded-[10px] border-[var(--line-soft)] text-base text-[var(--ink-900)] hover:bg-[var(--brand-100)]"
                >
                  <GoogleIcon />
                  <span>Google</span>
                </Button>

                <Button
                  type="button"
                  variant="soft"
                  size="lg"
                  className="h-12 gap-2 rounded-[10px] border-[var(--line-soft)] text-base text-[var(--ink-900)] hover:bg-[var(--brand-100)]"
                >
                  <FacebookIcon />
                  <span>Facebook</span>
                </Button>
              </div>

              <p className="mt-2 text-center text-[0.98rem] text-[var(--ink-600)]">
                Đã có tài khoản?{' '}
                <Link className="rounded-sm font-bold text-[var(--brand-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2" to="/login">Đăng nhập ngay</Link>
              </p>
            </form>

            <CapIcon />
          </div>
        </section>
      </div>
    </main>
  );
}