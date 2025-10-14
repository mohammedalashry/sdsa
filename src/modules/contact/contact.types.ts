export interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  message: string;
}

export interface ContactResponse {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  message: string;
  created_at?: Date;
  handled_by_id?: number;
}

export interface ContactListResponse {
  contacts: ContactResponse[];
  total: number;
  page: number;
  pageSize: number;
}
