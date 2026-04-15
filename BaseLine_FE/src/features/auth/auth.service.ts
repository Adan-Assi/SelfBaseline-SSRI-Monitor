import type { RuntimePolicy } from "../../config/runtimePolicy";
import { toHHMM, toISODateLocal } from "../../utils/date";
import { log } from "../../utils/logger";
import {
  createUser,
  getPatientProfile,
  loginUser as loginUserApi,
  updateAndInsertPatientDetails,
} from "./auth.api";

export type CompleteOnboardingInput = {
  name: string;
  email: string;
  password: string;
  birthDate: Date | null;
  checkinTime: Date | null;
};

export type CompleteOnboardingResult =
  | {
      kind: "success";
      userId: number;
      username: string;
      displayName: string;
      role: string;
    }
  | {
      kind: "fallback";
    };

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult =
  | {
      kind: "success";
      userId: number;
      username: string;
      displayName: string;
      role: string;
    }
  | {
      kind: "fallback";
    };

// --- Helpers --------------------
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// --- Complete onboarding --------------------
export async function completeOnboarding(
  input: CompleteOnboardingInput,
  policy: RuntimePolicy,
): Promise<CompleteOnboardingResult> {
  const { name, email, password, birthDate, checkinTime } = input;

  if (!policy.useBackend) {
    return { kind: "fallback" };
  }

  const normalizedEmail = normalizeEmail(email);
  const displayName = name.trim();

  if (!normalizedEmail) {
    throw new Error("AUTH_VALIDATION_MISSING_EMAIL");
  }

  if (!password.trim()) {
    throw new Error("AUTH_VALIDATION_MISSING_PASSWORD");
  }

  try {
    const user = await createUser({
      username: normalizedEmail,
      email: normalizedEmail,
      password,
      role: "PATIENT",
    });

    if (!user || typeof user.id !== "number" || user.id <= 0) {
      throw new Error("AUTH_INVALID_CREATE_USER_RESPONSE");
    }

    await updateAndInsertPatientDetails({
      user_id: user.id,
      full_name: displayName || normalizedEmail,
      birth_date: birthDate ? toISODateLocal(birthDate) : null,
      checkin_time: checkinTime ? toHHMM(checkinTime) : null,
    });

    return {
      kind: "success",
      userId: user.id,
      username: normalizedEmail,
      displayName: displayName || normalizedEmail,
      role: user.role ?? "PATIENT",
    };
  } catch (e) {
    if (policy.allowFallback) {
      log("[AuthService] onboarding fallback", {
        mode: policy.mode,
      });
      return { kind: "fallback" };
    }

    throw e;
  }
}

// --- Login with email mapped to backend username --------------------
export async function loginUser(
  input: LoginInput,
  policy: RuntimePolicy,
): Promise<LoginResult> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!policy.useBackend) {
    return { kind: "fallback" };
  }

  if (!normalizedEmail) {
    throw new Error("AUTH_VALIDATION_MISSING_EMAIL");
  }

  if (!input.password.trim()) {
    throw new Error("AUTH_VALIDATION_MISSING_PASSWORD");
  }

  try {
    const result = await loginUserApi({
      username: normalizedEmail,
      password: input.password,
    });

    if (
      !result ||
      typeof result.user_id !== "number" ||
      !Number.isFinite(result.user_id) ||
      result.user_id <= 0
    ) {
      throw new Error("AUTH_INVALID_LOGIN_RESPONSE");
    }

    const resolvedUsername = result.username || normalizedEmail;
    let displayName = resolvedUsername;

    try {
      const profile = await getPatientProfile(result.user_id);

      if (profile?.full_name && profile.full_name.trim()) {
        displayName = profile.full_name.trim();
      }
    } catch (profileError) {
      log("[AuthService] profile fetch after login failed", profileError);
    }

    return {
      kind: "success",
      userId: result.user_id,
      username: resolvedUsername,
      displayName,
      role: result.role ?? "PATIENT",
    };
  } catch (e) {
    if (policy.allowFallback) {
      log("[AuthService] login fallback", {
        mode: policy.mode,
      });
      return { kind: "fallback" };
    }

    throw e;
  }
}
