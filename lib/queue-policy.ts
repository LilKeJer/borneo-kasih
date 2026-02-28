export type QueuePolicySettings = {
  enableStrictCheckIn: boolean;
  checkInEarlyMinutes: number;
  checkInLateMinutes: number;
  enableAutoCancel: boolean;
  autoCancelGraceMinutes: number;
};

const MINUTES_MIN = 0;
const MINUTES_MAX = 24 * 60;

export const DEFAULT_QUEUE_POLICY: QueuePolicySettings = {
  enableStrictCheckIn: false,
  checkInEarlyMinutes: 120,
  checkInLateMinutes: 60,
  enableAutoCancel: false,
  autoCancelGraceMinutes: 30,
};

function clampMinutes(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  if (rounded < MINUTES_MIN) return MINUTES_MIN;
  if (rounded > MINUTES_MAX) return MINUTES_MAX;
  return rounded;
}

export function normalizeQueuePolicy(
  value: Partial<QueuePolicySettings> | null | undefined
): QueuePolicySettings {
  return {
    enableStrictCheckIn:
      value?.enableStrictCheckIn ?? DEFAULT_QUEUE_POLICY.enableStrictCheckIn,
    checkInEarlyMinutes: clampMinutes(
      Number(value?.checkInEarlyMinutes),
      DEFAULT_QUEUE_POLICY.checkInEarlyMinutes
    ),
    checkInLateMinutes: clampMinutes(
      Number(value?.checkInLateMinutes),
      DEFAULT_QUEUE_POLICY.checkInLateMinutes
    ),
    enableAutoCancel:
      value?.enableAutoCancel ?? DEFAULT_QUEUE_POLICY.enableAutoCancel,
    autoCancelGraceMinutes: clampMinutes(
      Number(value?.autoCancelGraceMinutes),
      DEFAULT_QUEUE_POLICY.autoCancelGraceMinutes
    ),
  };
}

export function toDateOnlyLocal(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function combineDateAndTime(baseDate: Date, sessionTime: Date): Date {
  const result = new Date(baseDate);
  result.setHours(
    sessionTime.getHours(),
    sessionTime.getMinutes(),
    sessionTime.getSeconds(),
    sessionTime.getMilliseconds()
  );
  return result;
}

function addMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000);
}

export function calculateSessionEndDateTime(
  reservationDate: Date,
  sessionStartTime: Date | null,
  sessionEndTime: Date | null
): Date | null {
  if (!sessionEndTime) return null;

  const endAt = combineDateAndTime(reservationDate, sessionEndTime);
  if (!sessionStartTime) return endAt;

  const startAt = combineDateAndTime(reservationDate, sessionStartTime);
  if (endAt <= startAt) {
    endAt.setDate(endAt.getDate() + 1);
  }

  return endAt;
}

export function calculateNoShowDeadline(params: {
  reservationDate: Date;
  sessionStartTime: Date | null;
  sessionEndTime: Date | null;
  checkInLateMinutes: number;
  autoCancelGraceMinutes: number;
}): Date {
  const appointmentLateDeadline = addMinutes(
    params.reservationDate,
    clampMinutes(params.checkInLateMinutes, DEFAULT_QUEUE_POLICY.checkInLateMinutes)
  );

  const sessionEndAt = calculateSessionEndDateTime(
    params.reservationDate,
    params.sessionStartTime,
    params.sessionEndTime
  );

  if (!sessionEndAt) return appointmentLateDeadline;

  const sessionGraceDeadline = addMinutes(
    sessionEndAt,
    clampMinutes(
      params.autoCancelGraceMinutes,
      DEFAULT_QUEUE_POLICY.autoCancelGraceMinutes
    )
  );

  return appointmentLateDeadline <= sessionGraceDeadline
    ? appointmentLateDeadline
    : sessionGraceDeadline;
}

export function calculateCheckInWindow(params: {
  reservationDate: Date;
  sessionStartTime: Date | null;
  sessionEndTime: Date | null;
  policy: QueuePolicySettings;
}): { startsAt: Date; endsAt: Date } {
  const startsAt = addMinutes(
    params.reservationDate,
    -clampMinutes(
      params.policy.checkInEarlyMinutes,
      DEFAULT_QUEUE_POLICY.checkInEarlyMinutes
    )
  );

  const endsAt = calculateNoShowDeadline({
    reservationDate: params.reservationDate,
    sessionStartTime: params.sessionStartTime,
    sessionEndTime: params.sessionEndTime,
    checkInLateMinutes: params.policy.checkInLateMinutes,
    autoCancelGraceMinutes: params.policy.autoCancelGraceMinutes,
  });

  return { startsAt, endsAt };
}
