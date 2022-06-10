import { createHash } from 'crypto';
import { uniq } from 'lodash';

export function getLastWeekDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
}

export function getLast1MonthDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
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

export const createDailyNotificationID = (
  notificationTitle: string,
  createdAt: number
) => {
  return shorthash(
    notificationTitle.toLowerCase() + new Date(createdAt).toLocaleDateString()
  );
};

export function extractVersions(data: unknown) {
  const versionRegExp = /\/(?<version>\d+\.\d+\.\d+)/g; // matches 5.25.0 from feat/5.25.0/SYST-000-title
  const strData = JSON.stringify(data);
  const versions = uniq(strData.match(versionRegExp) || [])
    .map(v => v.replace(/\//g, ''))
    .flat()
    .sort();
  return versions.sort().reverse();
}