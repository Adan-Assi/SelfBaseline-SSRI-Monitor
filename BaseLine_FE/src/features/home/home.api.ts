import { api } from "../../api/client";

// --- Types --------------------
export type PatientDashboardResponse = {
  full_name: string;
  birth_date: string | null;
  streak_count: number;
  next_checkin: string | null;
};

export type ProviderLinkResponse = {
  doctor: { name: string; phone: string | null } | null;
  caregiver: {
    name: string;
    phone: string | null;
    relation: string | null;
  } | null;
};

export type InsightsResponse = {
  patient_name: string;
  sessions: {
    session_date: string;
    answers: { question: string; answer: string }[];
  }[];
  insights: string[];
};

// --- API --------------------
export function fetchPatientDashboard(userId: number) {
  return api.get<PatientDashboardResponse>(`/patient/dashboard/${userId}`);
}

export function fetchProviderLink(userId: number) {
  return api.get<ProviderLinkResponse>(`/patient/provider-link/${userId}`);
}

export function fetchInsights(userId: number) {
  return api.get<InsightsResponse>(`/insights/${userId}`);
}
