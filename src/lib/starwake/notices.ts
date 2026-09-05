export const NOTICE_MS = 5_000;
export const NOTICE_CAP = 4;

export type Notice = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  until: number;
};

export function makeNotice(
  partial: { kicker: string; title: string; body: string },
  now = Date.now(),
  ms = NOTICE_MS,
): Notice {
  return {
    id: `n-${now.toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`,
    kicker: partial.kicker,
    title: partial.title,
    body: partial.body,
    until: now + Math.max(800, ms),
  };
}

export function liveNotices(list: Notice[], now = Date.now()): Notice[] {
  return list.filter((n) => n.until > now).slice(-NOTICE_CAP);
}
