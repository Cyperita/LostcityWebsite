import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat"

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat)

export const fromNow = (date: string) => {
  return dayjs(date).fromNow();
};

export const formatTime = (date: string) => {
  return dayjs(date).format('lll');
}
