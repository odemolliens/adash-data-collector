import { createHash } from 'crypto';

export function getLastWeekDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
}

export function getLast6MonthsDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
}

export function getYesterdayDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
}

export function shorthash(txt: string) {
  return createHash('sha256').update(txt).digest('hex').slice(0, 5);
}
