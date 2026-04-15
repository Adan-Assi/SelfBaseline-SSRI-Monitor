export function stripDayPrefix(label: string) {
  return label.replace(/^(today|tomorrow)\s*,\s*/i, "").trim();
}

export function buildNextCheckInValue(
  label: string,
  questionsDoneToday: boolean,
) {
  if (!label) return questionsDoneToday ? "tomorrow" : "";

  const timeOnly = stripDayPrefix(label);
  return questionsDoneToday ? `tomorrow, ${timeOnly}` : label;
}
