export interface Settings {
  endpointUrl: string;
  apiKey: string;
}

export interface ApiResponse {
  [key: string]: any;
}

export interface RequestLog {
  timestamp: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  response?: any;
  status?: number;
  error?: string;
}