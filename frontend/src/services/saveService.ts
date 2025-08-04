interface SaveCodeRequest {
  title: string;
  description?: string;
  code_content: string;
  language?: string;
  tags?: string[];
}

interface SaveLogRequest {
  title: string;
  description?: string;
  log_content: string;
  log_level?: string;
  source?: string;
  log_metadata?: Record<string, any>;
  tags?: string[];
}

interface SaveSessionRequest {
  title: string;
  description?: string;
  session_data: Record<string, any>;
}

interface SaveResponse {
  success: boolean;
  message: string;
  item_id?: string;
  item?: any;
}

interface SavedItem {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

interface SavedCode extends SavedItem {
  code_content: string;
  language?: string;
  tags?: string[];
}

interface SavedLog extends SavedItem {
  log_content: string;
  log_level?: string;
  source?: string;
  log_metadata?: Record<string, any>;
  tags?: string[];
}

interface SavedItemsResponse {
  items: SavedItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

class SaveService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async saveCode(request: SaveCodeRequest): Promise<SaveResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/save/code`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to save code:', error);
      throw error;
    }
  }

  async saveLogs(request: SaveLogRequest): Promise<SaveResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/save/logs`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to save logs:', error);
      throw error;
    }
  }

  async saveSession(request: SaveSessionRequest): Promise<SaveResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/save/session`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }

  async getSavedCodes(page: number = 1, perPage: number = 20, search?: string, language?: string): Promise<SavedItemsResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
      });

      if (search) params.append('search', search);
      if (language) params.append('language', language);

      const response = await fetch(`${this.baseUrl}/saved/codes?${params}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get saved codes:', error);
      throw error;
    }
  }

  async getSavedLogs(
    page: number = 1, 
    perPage: number = 20, 
    search?: string, 
    logLevel?: string, 
    source?: string
  ): Promise<SavedItemsResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
      });

      if (search) params.append('search', search);
      if (logLevel) params.append('log_level', logLevel);
      if (source) params.append('source', source);

      const response = await fetch(`${this.baseUrl}/saved/logs?${params}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get saved logs:', error);
      throw error;
    }
  }

  async deleteSavedCode(codeId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/saved/code/${codeId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete saved code:', error);
      throw error;
    }
  }

  async deleteSavedLog(logId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/saved/log/${logId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete saved log:', error);
      throw error;
    }
  }
}

const saveService = new SaveService();
export default saveService;

export type {
  SaveCodeRequest,
  SaveLogRequest,
  SaveSessionRequest,
  SaveResponse,
  SavedCode,
  SavedLog,
  SavedItem,
  SavedItemsResponse
};