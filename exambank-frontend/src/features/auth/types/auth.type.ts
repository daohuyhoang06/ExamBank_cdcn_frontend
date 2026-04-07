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
  email?: string;
  role?: string;
  roles?: string[];
};

export type AuthSuccess = {
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
  message?: string;
};
