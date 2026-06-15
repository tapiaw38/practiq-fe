export interface AuthRole {
  id: string;
  name: string;
}

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  auth_method: "password" | "google" | "hybrid";
  roles: AuthRole[];
}

export interface AuthApiUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string | null;
  picture?: string | null;
  address?: string | null;
  is_active: boolean;
  verified_email: boolean;
  token_version: number;
  auth_method: "password" | "google" | "hybrid" | string;
  roles: AuthRole[];
}

export interface LoginParams {
  email?: string;
  password?: string;
  ssoType?: "google";
  ssoCode?: string;
}

export interface RegisterParams {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  profile_type: "teacher" | "student";
}

export interface LoginResponse {
  token: string;
  data: AuthUser;
}

export interface RegisterResponse {
  data: AuthUser;
}
