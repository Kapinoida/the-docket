export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string;
  calendar_name: string;
  calendar_color?: string;
}

export interface CalendarSource {
  id: number;
  name: string;
  color: string;
  resource_type: string;
  server_url: string;
  calendar_url: string;
  username?: string;
}

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 124, g: 58, b: 237 };
};

export const eventColorStyle = (color?: string) => {
  const c = color || '#7c3aed';
  const { r, g, b } = hexToRgb(c);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.4)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.7)`,
    color: '#fff',
  };
};

export const isTrulyAllDay = (event: CalendarEvent) => {
  if (event.is_all_day) return true;
  if (typeof event.start_time === 'string' && event.start_time.endsWith('T00:00:00.000Z')) {
    const dur = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
    if (dur === 24 * 60 * 60 * 1000) return true;
  }
  return false;
};