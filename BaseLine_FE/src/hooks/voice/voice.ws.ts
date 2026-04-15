// --- Voice socket types --------------------
export interface TranscriptEntry {
  role: "agent" | "user" | "system";
  text: string;
  ts: Date;
}

export interface ServerMessage {
  mime_type?: string;
  data?: string;
  partial?: boolean;
  is_input_transcript?: boolean;
  is_output_transcript?: boolean;
  is_transcript?: boolean;
  turn_complete?: boolean;
  interrupted?: boolean;
}

// --- Socket helpers --------------------
export function wsStateName(state: number) {
  switch (state) {
    case 0:
      return "CONNECTING";
    case 1:
      return "OPEN";
    case 2:
      return "CLOSING";
    case 3:
      return "CLOSED";
    default:
      return String(state);
  }
}

export function safeJson(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}
