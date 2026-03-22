import './login-page.css';

const MailIcon = () => (
  <svg viewBox="0 0 24 24" className="auth-input-icon" aria-hidden="true">
    <path
      d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm0 2v.2l8 5.2 8-5.2V8l-8 5-8-5Z"
      fill="currentColor"
    />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" className="auth-input-icon" aria-hidden="true">
    <path
      d="M17 10h-1V8a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V8Zm2 8.75a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z"
      fill="currentColor"
    />
  </svg>
);

const BookIcon = () => (
  <svg viewBox="0 0 24 24" className="brand-icon" aria-hidden="true">
    <path
      d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v16.5a2.5 2.5 0 0 0-2.5-2.5H5V4.5Zm0 13h12.5A4.5 4.5 0 0 1 20 18.2V20H7.5A2.5 2.5 0 0 1 5 17.5Zm2-11v7h10V4H7Zm-2 0v9.3c.4-.2.9-.3 1.5-.3H6V4.3c-.6 0-1.1.1-1.5.3Z"
      fill="currentColor"
    />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" className="security-icon" aria-hidden="true">
    <path
      d="M12 2 4.5 5v6c0 5.3 3.4 10.2 7.5 11 4.1-.8 7.5-5.7 7.5-11V5L12 2Zm0 2.2 5.5 2.2v4.6c0 4.3-2.7 8.4-5.5 9.1-2.8-.7-5.5-4.8-5.5-9.1V6.4L12 4.2Z"
      fill="currentColor"
    />
  </svg>
);

const GoogleIcon = () => (
  <span className="social-badge social-badge--google" aria-hidden="true">
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
  <span className="social-badge social-badge--facebook" aria-hidden="true">
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
  return (
    <div className="login-page">
      <div className="login-page__panel login-page__panel--hero">
        <div className="login-page__hero-overlay" />

        <div className="login-page__hero-content">
          <div className="login-page__brand">
            <div className="login-page__brand-mark">
              <BookIcon />
            </div>
            <span>Scholarly Sanctuary</span>
          </div>

          <div className="login-page__hero-copy">
            <h1>
              Mở khóa tiềm năng,
              <br />
              chinh phục đỉnh cao
              <br />
              tri thức
            </h1>
            <p>
              Gia nhập cộng đồng học giả hàng đầu thế giới để tiếp cận những
              nguồn tài liệu độc quyền và phương pháp học tập hiện đại.
            </p>
          </div>

          <div className="login-page__security">
            <ShieldIcon />
            <span>Bảo mật &amp; Tin cậy</span>
          </div>
        </div>
      </div>

      <div className="login-page__panel login-page__panel--form">
        <div className="login-page__form-wrap">
          <div className="login-page__heading">
            <h2>Chào mừng bạn trở lại</h2>
            <p>Tiếp tục hành trình học tập cùng cộng đồng.</p>
          </div>

          <form className="login-form">
            <div className="form-group">
              <label htmlFor="email">EMAIL</label>
              <div className="input-shell">
                <MailIcon />
                <input id="email" type="email" placeholder="example@gmail.com" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">MẬT KHẨU</label>
              <div className="input-shell">
                <LockIcon />
                <input id="password" type="password" placeholder="••••••••" />
              </div>
            </div>

            <div className="login-form__meta">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Ghi nhớ mật khẩu</span>
              </label>

              <button type="button" className="text-link">
                Quên mật khẩu?
              </button>
            </div>

            <button type="submit" className="login-submit">
              Đăng nhập
            </button>

            <div className="social-divider">
              <span />
              <p>HOẶC ĐĂNG NHẬP VỚI</p>
              <span />
            </div>

            <div className="social-actions">
              <button type="button" className="social-button">
                <GoogleIcon />
                <span>Google</span>
              </button>

              <button type="button" className="social-button">
                <FacebookIcon />
                <span>Facebook</span>
              </button>
            </div>

            <p className="signup-text">
              Chưa có tài khoản? <button type="button">Đăng ký ngay</button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}