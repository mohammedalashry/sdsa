export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phonenumber: string | null;
  image: string;
  twitter_link: string;
  dob: string | null;
  address: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface CreateAdminRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phonenumber?: string;
  twitter_link?: string;
  dob?: string;
  address?: string;
}

export interface UpdateAdminRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  phonenumber?: string;
  twitter_link?: string;
  dob?: string;
  address?: string;
  is_active?: boolean;
}

export interface AdminListResponse {
  admins: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminSearchParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

