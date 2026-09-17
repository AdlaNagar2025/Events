/**
 * EventHub booking time policy (hours before event start):
 * - New booking: >= 6h
 * - Provider approve/reject deadline: >= 4h (else auto-REJECTED)
 * - Edit date / time / guests: >= 48h
 * - Add / remove providers: >= 6h
 * - Cancel (customer or provider): >= 48h
 */

const BOOKING_POLICY = {
  CREATE_MIN_HOURS: 6,
  PROVIDER_RESPONSE_HOURS: 4,
  CRITICAL_EDIT_HOURS: 48,
  PROVIDER_CHANGE_HOURS: 6,
  CANCEL_HOURS: 48,
};

function normalizeDate(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  return String(value).split("T")[0].slice(0, 10);
}

function normalizeTime(value) {
  return String(value || "").slice(0, 5);
}

function hoursUntilEvent(dateValue, timeValue) {
  const dateStr = normalizeDate(dateValue);
  const timeStr = normalizeTime(timeValue);
  if (!dateStr || !timeStr) return Number.NaN;
  const eventStart = new Date(`${dateStr}T${timeStr}`);
  if (Number.isNaN(eventStart.getTime())) return Number.NaN;
  return (eventStart.getTime() - Date.now()) / (1000 * 60 * 60);
}

function valuesEqual(a, b) {
  return String(a ?? "") === String(b ?? "");
}

function hasCriticalFieldChanges(currentEvent, updatingData) {
  const next = updatingData?.dataToEvent || {};
  const checks = [
    ["requested_date", normalizeDate],
    ["start_time", normalizeTime],
    ["end_time", normalizeTime],
    ["guest_number", (v) => String(v ?? "")],
  ];

  return checks.some(([field, normalize]) => {
    if (next[field] === undefined || next[field] === null) return false;
    return normalize(next[field]) !== normalize(currentEvent[field]);
  });
}

async function hasProviderRosterChanges(doQuery, currentEvent, updatingData, eventId) {
  if (updatingData.hallId !== undefined) {
    const nextHall = updatingData.hallId == null ? null : Number(updatingData.hallId);
    const currentHall =
      currentEvent.hall_id == null ? null : Number(currentEvent.hall_id);
    if (nextHall !== currentHall) return true;
  }

  if (updatingData.selectedChiefsId !== undefined) {
    const rows = await doQuery(
      `SELECT provider_id FROM event_providers WHERE event_id = ?`,
      [eventId],
    );
    const currentIds = (Array.isArray(rows) ? rows : [])
      .map((r) => Number(r.provider_id))
      .sort((a, b) => a - b);
    const nextIds = (
      Array.isArray(updatingData.selectedChiefsId)
        ? updatingData.selectedChiefsId
        : []
    )
      .filter((id) => id !== null && id !== undefined)
      .map(Number)
      .sort((a, b) => a - b);

    if (
      currentIds.length !== nextIds.length ||
      currentIds.some((id, index) => id !== nextIds[index])
    ) {
      return true;
    }
  }

  return false;
}

module.exports = {
  BOOKING_POLICY,
  normalizeDate,
  normalizeTime,
  hoursUntilEvent,
  valuesEqual,
  hasCriticalFieldChanges,
  hasProviderRosterChanges,
};
