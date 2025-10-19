export interface ExportRequest {
  fileType?: "xlsx" | "csv";
  league?: number;
  season?: number;
  round?: number;
  fixture?: number;
  player?: number;
  team?: number;
  player1?: number;
  player2?: number;
  team1?: number;
  team2?: number;
  season1?: number;
  season2?: number;
  coach1?: number;
  coach2?: number;
  referee1?: number;
  referee2?: number;
  // For comparison pages
  players?: number[];
  teams?: number[];
  coaches?: number[];
  referees?: number[];
}

export interface ExportResponse {
  success: boolean;
  message: string;
  filename?: string;
  downloadUrl?: string;
}

export interface ExportData {
  [sheetName: string]: any[] | any;
}

export const SUPPORTED_FILE_TYPES = ["xlsx", "csv"] as const;
export type FileType = (typeof SUPPORTED_FILE_TYPES)[number];

