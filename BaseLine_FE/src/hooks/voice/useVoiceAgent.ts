import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";

import { log } from "../../utils/logger";
import {
  BYTES_PER_MS,
  MIC_POLL_MS,
  MIN_CHUNK_BYTES,
  buildWavFileUri,
  makeRecording,
  setPlaybackMode,
  setRecordMode,
} from "./voice.audio";
import { base64ToBytes, clamp01, dbTo01 } from "./voice.encoding";
import {
  type ServerMessage,
  type TranscriptEntry,
  safeJson,
  wsStateName,
} from "./voice.ws";

type WsCloseEventLike = {
  code?: number;
  reason?: string;
};

type WsErrorEventLike = {
  type?: string;
};

function noopAsync() {
  return Promise.resolve();
}

export default function useVoiceAgent(wsUrl: string | null) {
  // --- State --------------------
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [status, setStatus] = useState("Tap Connect to start");
  const [micLevel, setMicLevel] = useState(0);

  // --- Core refs --------------------
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // --- Mic refs --------------------
  const micStartingRef = useRef(false);
  const micRunningRef = useRef(false);
  const micUiReadyRef = useRef(false);
  const hasStartedMicOnceRef = useRef(false);
  const pollBusyRef = useRef(false);
  const stopRequestedRef = useRef(false);

  // --- Conversation / playback refs --------------------
  const greetedRef = useRef(false);
  const pcmBufferRef = useRef<number[]>([]);
  const isPlayingRef = useRef(false);
  const generationIdRef = useRef(0);

  const partialInputRef = useRef("");
  const partialOutputRef = useRef("");
  const partialAgentMessageRef = useRef("");

  // --- Function refs --------------------
  const stopMicRef = useRef<(() => Promise<void>) | null>(null);
  const startMicRef = useRef<(() => Promise<void>) | null>(null);
  const micOpRef = useRef<Promise<void>>(Promise.resolve());

  // --- Helpers --------------------
  const runMicOp = useCallback(async (op: () => Promise<void>) => {
    micOpRef.current = micOpRef.current.then(op, op);
    await micOpRef.current;
  }, []);

  const sleep = useCallback((ms: number) => {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }, []);

  const addMessage = useCallback(
    (role: TranscriptEntry["role"], text: string) => {
      if (!text?.trim()) return;
      setTranscript((prev) => [...prev, { role, text, ts: new Date() }]);
    },
    [],
  );

  const clearPollingTimer = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const safeDeleteFile = useCallback(async (uri: string | null | undefined) => {
    if (!uri) return;
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }, []);

  const safeUnloadSound = useCallback(async (sound: Audio.Sound | null) => {
    if (!sound) return;
    await sound.unloadAsync().catch(() => {});
  }, []);

  // --- Playback --------------------
  const stopPlaybackNow = useCallback(async () => {
    generationIdRef.current++;

    const sound = soundRef.current;
    soundRef.current = null;

    if (sound) {
      try {
        await sound.stopAsync();
      } catch {}
      await safeUnloadSound(sound);
    }

    pcmBufferRef.current = [];
    isPlayingRef.current = false;
    setAgentSpeaking(false);
  }, [safeUnloadSound]);

  const drainAndPlay = useCallback(() => {
    if (isPlayingRef.current) return;
    if (pcmBufferRef.current.length === 0) return;

    isPlayingRef.current = true;
    setAgentSpeaking(true);
    setStatus("Responding...");

    const myGeneration = generationIdRef.current;

    void (async () => {
      let nextSound: Audio.Sound | null = null;
      let nextUri: string | null = null;
      let nextByteLen = 0;

      try {
        await (stopMicRef.current ?? noopAsync)();

        await runMicOp(async () => {
          await setPlaybackMode();
        });

        while (generationIdRef.current === myGeneration) {
          let sound: Audio.Sound;
          let uri: string;
          let chunkByteLen = 0;

          if (nextSound && nextUri) {
            sound = nextSound;
            uri = nextUri;
            chunkByteLen = nextByteLen;
            nextSound = null;
            nextUri = null;
            nextByteLen = 0;
          } else if (pcmBufferRef.current.length > 0) {
            const bytes = pcmBufferRef.current;
            pcmBufferRef.current = [];
            chunkByteLen = bytes.length;

            const builtUri = await buildWavFileUri(bytes);
            if (!builtUri || generationIdRef.current !== myGeneration) {
              await safeDeleteFile(builtUri);
              break;
            }

            uri = builtUri;
            ({ sound } = await Audio.Sound.createAsync({ uri }));
          } else {
            break;
          }

          soundRef.current = sound;
          await sound.playAsync();

          const chunkMs = chunkByteLen / BYTES_PER_MS;

          const preloadPromise = (async (): Promise<{
            sound: Audio.Sound;
            uri: string;
            len: number;
          } | null> => {
            const maxWaitMs = Math.max(Math.floor(chunkMs * 0.85), 250);
            const deadline = Date.now() + maxWaitMs;

            while (
              pcmBufferRef.current.length < MIN_CHUNK_BYTES &&
              Date.now() < deadline
            ) {
              await sleep(50);
              if (generationIdRef.current !== myGeneration) return null;
            }

            if (
              pcmBufferRef.current.length === 0 ||
              generationIdRef.current !== myGeneration
            ) {
              return null;
            }

            const preBytes = pcmBufferRef.current;
            pcmBufferRef.current = [];

            try {
              const preloadUri = await buildWavFileUri(preBytes);
              if (!preloadUri || generationIdRef.current !== myGeneration) {
                await safeDeleteFile(preloadUri);
                return null;
              }

              const { sound: preloadedSound } = await Audio.Sound.createAsync({
                uri: preloadUri,
              });

              return {
                sound: preloadedSound,
                uri: preloadUri,
                len: preBytes.length,
              };
            } catch {
              return null;
            }
          })();

          await new Promise<void>((resolve) => {
            sound.setOnPlaybackStatusUpdate((playbackStatus) => {
              if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
                resolve();
              }
            });
          });

          soundRef.current = null;
          await safeUnloadSound(sound);
          await safeDeleteFile(uri);

          const preloaded = await preloadPromise;

          if (preloaded && generationIdRef.current === myGeneration) {
            nextSound = preloaded.sound;
            nextUri = preloaded.uri;
            nextByteLen = preloaded.len;
          } else if (preloaded) {
            await safeUnloadSound(preloaded.sound);
            await safeDeleteFile(preloaded.uri);
          }
        }

        if (nextSound) {
          await safeUnloadSound(nextSound);
        }
        if (nextUri) {
          await safeDeleteFile(nextUri);
        }
      } catch (e) {
        log("[VoiceAgent] playback failed", e);
      } finally {
        isPlayingRef.current = false;
        soundRef.current = null;

        if (generationIdRef.current === myGeneration) {
          setAgentSpeaking(false);

          if (!greetedRef.current) {
            greetedRef.current = true;
          }

          setStatus("Listening...");
          await (startMicRef.current ?? noopAsync)();
        }
      }
    })();
  }, [runMicOp, safeDeleteFile, safeUnloadSound, sleep]);

  const enqueueAudio = useCallback(
    (base64Pcm: string) => {
      const bytes = base64ToBytes(base64Pcm);

      for (let i = 0; i < bytes.length; i++) {
        pcmBufferRef.current.push(bytes[i]);
      }

      if (pcmBufferRef.current.length >= MIN_CHUNK_BYTES) {
        drainAndPlay();
      }
    },
    [drainAndPlay],
  );

  // --- Mic control --------------------
  const stopMic = useCallback(async () => {
    await runMicOp(async () => {
      stopRequestedRef.current = true;
      micRunningRef.current = false;
      micUiReadyRef.current = false;

      clearPollingTimer();

      const recording = recordingRef.current;
      recordingRef.current = null;

      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch {}
      }

      pollBusyRef.current = false;
      setIsRecording(false);
      setMicLevel(0);
    });
  }, [clearPollingTimer, runMicOp]);

  const startFreshRecording = useCallback(async () => {
    await setRecordMode();

    const existing = recordingRef.current;
    recordingRef.current = null;

    if (existing) {
      try {
        await existing.stopAndUnloadAsync();
      } catch {}
    }

    recordingRef.current = await makeRecording();
  }, []);

  const streamMic = useCallback(async () => {
    await runMicOp(async () => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      if (micStartingRef.current || micRunningRef.current) return;

      micStartingRef.current = true;
      stopRequestedRef.current = false;

      try {
        await startFreshRecording();

        micRunningRef.current = true;
        micUiReadyRef.current = false;
        setIsRecording(false);
        setMicLevel(0);

        if (!hasStartedMicOnceRef.current && !greetedRef.current) {
          setStatus("Starting...");
        }

        const pollOnce = async () => {
          if (!micRunningRef.current || stopRequestedRef.current) return;
          if (pollBusyRef.current) return;

          pollBusyRef.current = true;

          try {
            const liveWs = wsRef.current;
            if (!liveWs || liveWs.readyState !== WebSocket.OPEN) return;

            await runMicOp(async () => {
              const previousRecording = recordingRef.current;
              recordingRef.current = null;

              if (previousRecording) {
                try {
                  const recordingStatus =
                    await previousRecording.getStatusAsync();
                  const maybeDb = (recordingStatus as { metering?: number })
                    ?.metering;
                  const raw = typeof maybeDb === "number" ? dbTo01(maybeDb) : 0;
                  const gated = raw < 0.04 ? 0 : raw;

                  setMicLevel(clamp01(gated));
                  await previousRecording.stopAndUnloadAsync();
                } catch (e) {
                  log("[VoiceAgent] mic poll stop failed", e);
                  return;
                }

                const uri = previousRecording.getURI();

                if (uri) {
                  const base64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: "base64",
                  });

                  if (base64 && base64.length > 100) {
                    liveWs.send(
                      JSON.stringify({
                        mime_type: "audio/pcm",
                        data: base64,
                      }),
                    );
                  }

                  await safeDeleteFile(uri);
                }
              }

              if (!micRunningRef.current || stopRequestedRef.current) return;

              await startFreshRecording();

              if (!micUiReadyRef.current) {
                micUiReadyRef.current = true;
                setIsRecording(true);
                setStatus("Listening...");
                hasStartedMicOnceRef.current = true;
              }
            });
          } catch (e) {
            log("[VoiceAgent] mic poll failed", e);
          } finally {
            pollBusyRef.current = false;

            if (micRunningRef.current && !stopRequestedRef.current) {
              pollingRef.current = setTimeout(pollOnce, MIC_POLL_MS);
            }
          }
        };

        pollingRef.current = setTimeout(pollOnce, MIC_POLL_MS);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "unknown";
        log("[VoiceAgent] stream mic failed", e);
        setStatus(`Mic error: ${message}`);
        await stopMic();
      } finally {
        micStartingRef.current = false;
      }
    });
  }, [runMicOp, safeDeleteFile, startFreshRecording, stopMic]);

  stopMicRef.current = stopMic;
  startMicRef.current = streamMic;

  // --- WebSocket connection --------------------
  const connect = useCallback(async () => {
    if (!wsUrl) {
      setStatus("Voice is unavailable in this mode");
      return;
    }

    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      setStatus("Microphone permission denied");
      return;
    }

    hasStartedMicOnceRef.current = false;

    setStatus("Connecting...");
    setTranscript([]);
    setMicLevel(0);

    partialInputRef.current = "";
    partialOutputRef.current = "";
    partialAgentMessageRef.current = "";
    pcmBufferRef.current = [];
    generationIdRef.current++;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      greetedRef.current = false;
      setIsConnected(true);
      setStatus("Waiting for agent...");
      addMessage("system", "Connected to voice agent");

      log(
        "[VoiceAgent] ws open",
        safeJson({ state: wsStateName(ws.readyState) }),
      );
    };

    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;

      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      try {
        if (msg.mime_type === "audio/pcm" && msg.data) {
          enqueueAudio(msg.data);
        }

        if (msg.is_input_transcript) {
          if (msg.partial) {
            partialInputRef.current = msg.data ?? "";
          } else {
            const text = msg.data || partialInputRef.current;
            if (text) addMessage("user", text);
            partialInputRef.current = "";
          }
          return;
        }

        if (msg.is_output_transcript) {
          if (msg.partial) {
            partialOutputRef.current = msg.data ?? "";
          } else {
            const text = msg.data || partialOutputRef.current;
            if (text) addMessage("agent", text);
            partialOutputRef.current = "";
          }
          return;
        }

        if (msg.mime_type === "text/plain" && msg.data && !msg.is_transcript) {
          partialAgentMessageRef.current += msg.data;
          return;
        }

        if (msg.turn_complete === true) {
          if (partialAgentMessageRef.current) {
            addMessage("agent", partialAgentMessageRef.current);
            partialAgentMessageRef.current = "";
          }

          const isFirstTurn = !greetedRef.current;

          if (pcmBufferRef.current.length === 0 && !isPlayingRef.current) {
            if (isFirstTurn) {
              greetedRef.current = true;
              setStatus("Starting...");
              void streamMic();
            } else {
              setStatus("Listening...");
            }
            return;
          }

          drainAndPlay();
          return;
        }

        if (msg.interrupted) {
          generationIdRef.current++;
          pcmBufferRef.current = [];

          const sound = soundRef.current;
          soundRef.current = null;

          if (sound) {
            try {
              void sound.stopAsync();
              void sound.unloadAsync();
            } catch {}
          }

          isPlayingRef.current = false;
          setAgentSpeaking(false);
          partialAgentMessageRef.current = "";
          setStatus("Listening...");
          void streamMic();
        }
      } catch (e) {
        log("[VoiceAgent] ws message handler failed", e);
      }
    };

    ws.onerror = (e: Event | WsErrorEventLike) => {
      log(
        "[VoiceAgent] ws error",
        safeJson({
          type: "type" in e ? e.type : undefined,
          readyState: ws.readyState,
          readyStateName: wsStateName(ws.readyState),
          url: ws.url,
        }),
      );
      setStatus("Connection error");
    };

    ws.onclose = (e: CloseEvent | WsCloseEventLike) => {
      void stopPlaybackNow();
      void stopMic();

      setIsConnected(false);

      const code = e?.code;
      const reason = e?.reason;

      log("[VoiceAgent] ws close", safeJson({ code, reason }));

      setStatus(`Disconnected (Code: ${code ?? "?"})`);
      addMessage(
        "system",
        `Session ended (Code ${code ?? "?"}${reason ? `, ${reason}` : ""})`,
      );
    };
  }, [
    wsUrl,
    addMessage,
    enqueueAudio,
    drainAndPlay,
    streamMic,
    stopMic,
    stopPlaybackNow,
  ]);

  const disconnect = useCallback(async () => {
    await stopPlaybackNow();
    await stopMic();

    const ws = wsRef.current;
    wsRef.current = null;

    if (ws) {
      try {
        ws.close();
      } catch {}
    }

    setIsConnected(false);
    setStatus("Disconnected");
    setMicLevel(0);
  }, [stopMic, stopPlaybackNow]);

  // --- Cleanup --------------------
  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  // --- Public API --------------------
  return {
    isConnected,
    isRecording,
    agentSpeaking,
    transcript,
    status,
    micLevel,
    connect,
    disconnect,
  };
}
