import AsyncStorage from "@react-native-async-storage/async-storage";

export type StoredAuthSession = {
  userId: number | null;
  username: string | null;
  displayName: string | null;
  role: string | null;
};

const AUTH_SESSION_KEY = "auth.session.v1";

// --- Save auth session --------------------
export async function saveAuthSession(session: StoredAuthSession) {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

// --- Load auth session --------------------
export async function loadAuthSession(): Promise<StoredAuthSession | null> {
  const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredAuthSession;

    return {
      userId:
        typeof parsed?.userId === "number" && parsed.userId > 0
          ? parsed.userId
          : null,
      username:
        typeof parsed?.username === "string" && parsed.username.trim()
          ? parsed.username.trim()
          : null,
      displayName:
        typeof parsed?.displayName === "string" && parsed.displayName.trim()
          ? parsed.displayName.trim()
          : null,
      role:
        typeof parsed?.role === "string" && parsed.role.trim()
          ? parsed.role.trim()
          : null,
    };
  } catch {
    return null;
  }
}

// --- Clear auth session --------------------
export async function clearAuthSession() {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
}
