import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/he';
import { CLINIC_TIMEZONE } from '@medtime/shared';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('he');
export const clinicDate = (value?: string | Date) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? dayjs.tz(value, CLINIC_TIMEZONE)
    : dayjs(value).tz(CLINIC_TIMEZONE);
export const today = () => clinicDate().format('YYYY-MM-DD');
export const dateLabel = (value: string) => clinicDate(value).format('dddd, D בMMMM YYYY');
export const timeLabel = (value: string) => clinicDate(value).format('HH:mm');
export const dayBounds = (date: string, week = false) => {
  const nextDate = dayjs(date)
    .add(week ? 7 : 1, 'day')
    .format('YYYY-MM-DD');
  return {
    from: dayjs.tz(date, CLINIC_TIMEZONE).toISOString(),
    to: dayjs.tz(nextDate, CLINIC_TIMEZONE).toISOString(),
  };
};
export default dayjs;
