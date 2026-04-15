import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";

const KEY = "sensor:appSessions";

export type AppSession = {
  start: string;
  end: string;
  state: "foreground" | "background";
};

type Persisted = {
  current?: { start: string; state: "foreground" | "background" };
  sessions: AppSession[];
};

// --- Storage helpers --------------------
async function load(): Promise<Persisted> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { sessions: [] };

  try {
    return JSON.parse(raw) as Persisted;
  } catch {
    return { sessions: [] };
  }
}

async function save(p: Persisted) {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}

function toState(s: AppStateStatus): "foreground" | "background" {
  return s === "active" ? "foreground" : "background";
}

// --- Write queue --------------------
let writeChain: Promise<void> = Promise.resolve();

function enqueueWrite(fn: () => Promise<void>) {
  writeChain = writeChain.then(fn).catch(() => {});
  return writeChain;
}

// --- Session tracking --------------------
export function startAppSessionTracking() {
  let lastState: "foreground" | "background" = toState(AppState.currentState);

  void enqueueWrite(async () => {
    const p = await load();

    if (!p.current) {
      p.current = { start: new Date().toISOString(), state: lastState };
      await save(p);
    }
  });

  const sub = AppState.addEventListener("change", (next) => {
    const nextState = toState(next);
    if (nextState === lastState) return;

    const nowIso = new Date().toISOString();

    void enqueueWrite(async () => {
      const p = await load();

      if (p.current) {
        p.sessions.push({
          start: p.current.start,
          end: nowIso,
          state: p.current.state,
        });
      }

      p.current = { start: nowIso, state: nextState };
      await save(p);
    });

    lastState = nextState;
  });

  return () => sub.remove();
}

// --- Query helpers --------------------
export async function getAppSessionsInWindow(
  windowStart: Date,
  windowEnd: Date,
): Promise<AppSession[]> {
  const p = await load();
  const startMs = windowStart.getTime();
  const endMs = windowEnd.getTime();

  const sessions = [...p.sessions];

  if (p.current) {
    sessions.push({
      start: p.current.start,
      end: new Date().toISOString(),
      state: p.current.state,
    });
  }

  const out: AppSession[] = [];

  for (const s of sessions) {
    const a = new Date(s.start).getTime();
    const b = new Date(s.end).getTime();
    const left = Math.max(a, startMs);
    const right = Math.min(b, endMs);

    if (right <= left) continue;

    out.push({
      start: new Date(left).toISOString(),
      end: new Date(right).toISOString(),
      state: s.state,
    });
  }

  return out;
}

// --- Cleanup --------------------
export async function pruneAppSessions(keepDays = 7) {
  await enqueueWrite(async () => {
    const p = await load();
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;

    p.sessions = p.sessions.filter((s) => new Date(s.end).getTime() >= cutoff);
    await save(p);
  });
}

// --- Smoothing --------------------
export function smoothAppSessions(
  sessions: AppSession[],
  minMs = 2000,
): AppSession[] {
  if (!sessions.length) return sessions;

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  const merged: AppSession[] = [];

  for (const s of sorted) {
    const a = new Date(s.start).getTime();
    const b = new Date(s.end).getTime();
    if (b <= a) continue;

    const last = merged[merged.length - 1];

    if (!last) {
      merged.push({ ...s });
      continue;
    }

    const lastStart = new Date(last.start).getTime();
    const lastEnd = new Date(last.end).getTime();
    const start = Math.max(a, lastStart);
    const end = Math.max(b, start);

    if (start <= lastEnd) {
      if (end > lastEnd) last.end = new Date(end).toISOString();
      continue;
    }

    if (last.state === s.state && start - lastEnd <= 250) {
      last.end = new Date(end).toISOString();
      continue;
    }

    merged.push({
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      state: s.state,
    });
  }

  const out: AppSession[] = [];

  for (let i = 0; i < merged.length; i++) {
    const cur = merged[i];
    const dur = new Date(cur.end).getTime() - new Date(cur.start).getTime();

    if (dur >= minMs) {
      out.push(cur);
      continue;
    }

    const prev = out[out.length - 1];
    const next = i + 1 < merged.length ? merged[i + 1] : null;

    if (prev) {
      prev.end = cur.end;
    } else if (next) {
      next.start = cur.start;
    }
  }

  const final: AppSession[] = [];

  for (const s of out) {
    const last = final[final.length - 1];

    if (!last) {
      final.push({ ...s });
      continue;
    }

    if (last.state === s.state) {
      if (new Date(s.end).getTime() > new Date(last.end).getTime()) {
        last.end = s.end;
      }
    } else {
      final.push({ ...s });
    }
  }

  return final;
}
