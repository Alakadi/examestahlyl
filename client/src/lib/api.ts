import axios, { AxiosInstance } from "axios";

const API_BASE_URL = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// ============ AUTH API ============
export const authAPI = {
  getMe: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// ============ SUBJECTS API ============
export const subjectsAPI = {
  create: (data: any) => api.post("/subjects", data),
  getAll: () => api.get("/subjects"),
  getById: (id: number) => api.get(`/subjects/${id}`),
  delete: (id: number) => api.delete(`/subjects/${id}`),
};

// ============ SECTIONS API ============
export const sectionsAPI = {
  create: (data: any) => api.post("/sections", data),
  getBySubject: (subjectId: number) => api.get(`/sections/subject/${subjectId}`),
  delete: (id: number) => api.delete(`/sections/${id}`),
};

// ============ QUESTIONS API ============
export const questionsAPI = {
  create: (data: any) => api.post("/questions", data),
  getBySection: (sectionId: number) => api.get(`/questions/section/${sectionId}`),
  delete: (id: number) => api.delete(`/questions/${id}`),
  bulkImport: (data: any) => api.post("/questions/bulk-import", data),
};

// ============ EXAMS API ============
export const examsAPI = {
  create: (data: any) => api.post("/exams", data),
  getById: (id: number) => api.get(`/exams/${id}`),
  getBySubject: (subjectId: number) => api.get(`/exams/subject/${subjectId}`),
  delete: (id: number) => api.delete(`/exams/${id}`),
  getQuestions: (examId: number) => api.get(`/exams/${examId}/questions`),
};

// ============ EXAM CODES API ============
export const examCodesAPI = {
  create: (data: any) => api.post("/exam-codes", data),
  validate: (code: string) => api.get(`/exam-codes/validate/${code}`),
  getByExam: (examId: number) => api.get(`/exam-codes/exam/${examId}`),
};

// ============ RESULTS API ============
export const resultsAPI = {
  submit: (data: any) => api.post("/results/submit", data),
  getByUser: () => api.get("/results/user"),
  getById: (id: number) => api.get(`/results/${id}`),
};

// ============ ASSESSMENT TEXTS API ============
export const assessmentTextsAPI = {
  create: (data: any) => api.post("/assessment-texts", data),
  getByExam: (examId: number) => api.get(`/assessment-texts/exam/${examId}`),
};

// ============ CHAT API ============
export const chatAPI = {
  send: (data: any) => api.post("/chat", data),
};

export default api;
