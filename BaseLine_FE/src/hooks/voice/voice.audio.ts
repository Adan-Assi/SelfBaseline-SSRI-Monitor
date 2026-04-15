import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { buildWavBytes, bytesToBase64 } from "./voice.encoding";

// --- Audio constants --------------------
export const MIC_SAMPLE_RATE = 16_000;
export const SPEAKER_SAMPLE_RATE = 24_000;
export const CHANNELS = 1;
export const BIT_DEPTH = 16;
export const MIC_POLL_MS = 500;
export const MIN_CHUNK_BYTES = 72_000; // ~1.5s at 24kHz/16bit/mono
export const BYTES_PER_MS =
  (SPEAKER_SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8)) / 1000;

// --- Platform helpers --------------------
async function settleAudioMode() {
  if (Platform.OS === "ios") {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// --- Audio mode --------------------
export async function setRecordMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    playThroughEarpieceAndroid: false,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });

  await settleAudioMode();
}

export async function setPlaybackMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    playThroughEarpieceAndroid: false,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });

  await settleAudioMode();
}

// --- Recording --------------------
export async function makeRecording(): Promise<Audio.Recording> {
  const rec = new Audio.Recording();

  await rec.prepareToRecordAsync({
    isMeteringEnabled: true,
    android: {
      extension: ".wav",
      outputFormat: 0,
      audioEncoder: 0,
      sampleRate: MIC_SAMPLE_RATE,
      numberOfChannels: CHANNELS,
      bitRate: MIC_SAMPLE_RATE * BIT_DEPTH,
    },
    ios: {
      extension: ".wav",
      audioQuality: 127,
      sampleRate: MIC_SAMPLE_RATE,
      numberOfChannels: CHANNELS,
      bitRate: MIC_SAMPLE_RATE * BIT_DEPTH,
      linearPCMBitDepth: BIT_DEPTH,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {},
  });

  await rec.startAsync();
  return rec;
}

// --- WAV file building --------------------
export async function buildWavFileUri(
  pcmBytes: number[],
): Promise<string | null> {
  const baseDir =
    FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? null;
  if (!baseDir) return null;

  const fullWavBytes = buildWavBytes({
    pcmBytes,
    sampleRate: SPEAKER_SAMPLE_RATE,
    channels: CHANNELS,
    bitDepth: BIT_DEPTH,
  });

  const fullWavB64 = bytesToBase64(fullWavBytes);

  const uri = `${baseDir}agent_${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(uri, fullWavB64, { encoding: "base64" });

  return uri;
}
