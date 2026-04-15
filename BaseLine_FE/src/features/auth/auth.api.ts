import { request } from "../../api/client";

type UserResponse = {
  id: number;
  role: string;
  username: string;
  email: string;
  is_active: boolean;
};

export type LoginResponse = {
  user_id: number;
  role: string;
  username: string;
};

export type PatientProfileResponse = {
  full_name: string;
  birth_date: string | null;
  streak_count: number;
  next_checkin: string | null;
};

// --- User creation --------------------
export async function createUser(payload: {
  username: string;
  email: string;
  password: string;
  role: "PATIENT";
}) {
  return request<UserResponse>("/users", {
    method: "POST",
    body: payload,
  });
}

// --- Login --------------------
export async function loginUser(payload: {
  username: string;
  password: string;
}) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

// --- Read patient profile --------------------
export async function getPatientProfile(userId: number) {
  return request<PatientProfileResponse>(`/patient/dashboard/${userId}`, {
    method: "GET",
  });
}

// --- Patient profile setup --------------------
export async function updateAndInsertPatientDetails(payload: {
  user_id: number;
  full_name: string;
  birth_date?: string | null;
  checkin_time?: string | null;
}) {
  return request("/patient/details", {
    method: "POST",
    body: payload,
  });
}
