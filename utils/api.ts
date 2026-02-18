const API_BASE = "https://api-inventory.isavralabel.com/robotic-hub";

const TOKEN_KEY = 'robo_hub_token';

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearAuth() {
  setToken(null);
  onUnauthorized?.();
}

/**
 * URL lengkap untuk gambar/upload (path relatif dari backend uploads folder)
 * Jika path sudah full URL, dikembalikan as-is.
 */
export function getImageUrl(pathOrUrl: string | undefined | null): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  const base = API_BASE.replace(/\/$/, '');
  const segment = pathOrUrl.replace(/^\//, '');
  return segment ? `${base}/uploads/${segment}` : base + '/uploads/';
}

async function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown; formData?: FormData }
): Promise<T> {
  const url = `${API_BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let fetchOptions: RequestInit = { method };
  if (options?.formData) {
    fetchOptions.body = options.formData;
    // jangan set Content-Type; browser akan set multipart boundary
  } else if (options?.body != null && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  }
  fetchOptions.headers = headers;
  const res = await fetch(url, fetchOptions);
  if (res.status === 401) {
    clearAuth();
    throw new Error('Unauthorized');
  }
  const text = await res.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error(res.statusText || 'Server error');
  }
  if (!res.ok) {
    const err = data as { error?: string };
    throw new Error(err?.error || res.statusText || 'Request failed');
  }
  return data;
}

// ---- Auth ----
export const auth = {
  async login(email: string, password: string) {
    const res = await request<{ user: { id: string; name: string; email: string; role: string; avatar?: string }; token: string }>(
      'POST',
      '/api/auth/login',
      { body: { email, password } }
    );
    return res;
  },
  async register(name: string, email: string, password: string, role: 'ADMIN' | 'ANGGOTA') {
    return request<{ message: string; user: { id: string; name: string; email: string; role: string; avatar?: string } }>(
      'POST',
      '/api/auth/register',
      { body: { name, email, password, role } }
    );
  },
};

// ---- Users ----
export const api = {
  async getUsers() {
    return request<{ id: string; name: string; email: string; role: string; avatar?: string }[]>('GET', '/api/users');
  },
  async patchMeAvatar(formData: FormData) {
    return request<{ id: string; name: string; email: string; role: string; avatar?: string }>(
      'PATCH',
      '/api/users/me',
      { formData }
    );
  },

  async getGallery() {
    return request<{ id: string; title: string; url: string }[]>('GET', '/api/gallery');
  },
  async postGallery(formData: FormData) {
    return request<{ id: string; title: string; url: string }>('POST', '/api/gallery', { formData });
  },
  async deleteGallery(id: string) {
    return request<{ ok: boolean }>('DELETE', `/api/gallery/${id}`);
  },

  async getLearning() {
    return request<{ id: string; title: string; type: string; url: string }[]>('GET', '/api/learning');
  },
  async postLearningFile(formData: FormData) {
    return request<{ id: string; title: string; type: string; url: string }>('POST', '/api/learning', { formData });
  },
  async postLearningLink(body: { title: string; type: 'PDF' | 'VIDEO'; url: string }) {
    return request<{ id: string; title: string; type: string; url: string }>('POST', '/api/learning', { body });
  },
  async deleteLearning(id: string) {
    return request<{ ok: boolean }>('DELETE', `/api/learning/${id}`);
  },

  async getActivities() {
    return request<{ id: string; title: string; description: string; date: string; status: string }[]>('GET', '/api/activities');
  },
  async postActivity(body: { title: string; date: string; time?: string; description?: string }) {
    return request<{ id: string; title: string; description: string; date: string; status: string }>(
      'POST',
      '/api/activities',
      { body }
    );
  },

  async getAttendance() {
    return request<
      { id: string; memberName: string; activityName: string; activityId: string; date: string; status: string }[]
    >('GET', '/api/attendance');
  },
  async postAttendance(body: { activityId: string; memberName?: string; date?: string }) {
    return request<{ id: string; memberName: string; activityName: string; date: string; status: string }>(
      'POST',
      '/api/attendance',
      { body }
    );
  },

  async getProfile() {
    return request<{
      history: string;
      vision: string;
      mission: string[];
      structure: { id: string; name: string; role: string; parentId?: string; photoUrl?: string }[];
    }>('GET', '/api/profile');
  },
  async patchProfile(body: { history?: string; vision?: string; mission?: string[] }) {
    return request<{ history: string; vision: string; mission: string[] }>('PATCH', '/api/profile', { body });
  },
  async postProfileStructure(formData: FormData) {
    return request<{ id: string; name: string; role: string; parentId?: string; photoUrl?: string }>(
      'POST',
      '/api/profile/structure',
      { formData }
    );
  },
  async deleteProfileStructure(id: string) {
    return request<{ ok: boolean }>('DELETE', `/api/profile/structure/${id}`);
  },

  async getAchievements() {
    return request<{ id: string; title: string; year: string; description: string; photoUrl?: string }[]>(
      'GET',
      '/api/achievements'
    );
  },
  async postAchievement(formData: FormData) {
    return request<{ id: string; title: string; year: string; description: string; photoUrl?: string }>(
      'POST',
      '/api/achievements',
      { formData }
    );
  },
  async deleteAchievement(id: string) {
    return request<{ ok: boolean }>('DELETE', `/api/achievements/${id}`);
  },
};
