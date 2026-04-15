import { Audio } from "expo-av";
import { useEffect, useState } from "react";
import { clamp01, dbTo01 } from "./voice.encoding";

// ---------- GLOBAL SINGLETON STATE ----------
let recording: Audio.Recording | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let lastLevel = 0;

let starting = false;
let subscribers = 0;
function stopInternal() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

async function startInternal(setLevel: (v: number) => void) {
  if (starting) return;
  if (recording) return;

  starting = true;
  try {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    const r = new Audio.Recording();
    recording = r;

    await r.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
    } as any);

    await r.startAsync();

    timer = setInterval(async () => {
      if (!recording) return;

      const status = await recording.getStatusAsync();
      if (!status.isRecording) return;

      const db = (status as any).metering;
      const raw = typeof db === "number" ? dbTo01(db) : 0;

      // noise gate
      const gated = raw < 0.04 ? 0 : raw;

      const rising = gated > lastLevel;
      const next = rising
        ? lastLevel * 0.35 + gated * 0.65
        : lastLevel * 0.05 + gated * 0.95;

      lastLevel = next;
      setLevel(clamp01(next));
    }, 90);
  } catch (e) {
    recording = null;
    stopInternal();
    lastLevel = 0;
    throw e;
  } finally {
    starting = false;
  }
}

async function releaseInternal(setLevel: (v: number) => void) {
  subscribers = Math.max(0, subscribers - 1);
  if (subscribers > 0) return;

  stopInternal();
  const r = recording;
  recording = null;

  if (r) {
    try {
      const status = await r.getStatusAsync();
      if (status.isRecording) {
        await r.stopAndUnloadAsync();
      } else {
        await r.stopAndUnloadAsync().catch(() => {});
      }
    } catch {}
  }

  lastLevel = 0;
  setLevel(0);
}

// ---------- HOOK API ----------
export function useMicLevel() {
  const [level, setLevel] = useState(0);

  async function start() {
    subscribers += 1;
    await startInternal(setLevel);
  }

  async function stop() {
    await releaseInternal(setLevel);
  }

  useEffect(() => {
    return () => {
      void stop();
    };
  }, []);

  return { level, start, stop };
}
