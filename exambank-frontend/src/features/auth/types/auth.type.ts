export type LoginPayload = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type AuthUser = {
  id?: string | number;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  roles?: string[];
  avatarUrl?: string;
  coinBalance?: number;
};

export type AuthSuccess = {
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
  message?: string;
};
