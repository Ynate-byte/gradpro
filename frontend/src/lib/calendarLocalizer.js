import { format, parse, startOfWeek, getDay } from 'date-fns';
import { dateFnsLocalizer } from 'react-big-calendar';
import vi from 'date-fns/locale/vi';

const locales = {
  'vi': vi,
};

// Cấu hình localizer để sử dụng Tiếng Việt (vi)
// Tuần bắt đầu từ Thứ 2 (monday)
export const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }), // 1 = Thứ 2
  getDay,
  locales,
});