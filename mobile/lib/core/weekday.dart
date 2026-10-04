/// Maps Dart's DateTime.weekday (1=Monday..7=Sunday) to the backend's
/// DayOfWeek enum (SUN, MON, ...) — see Prisma schema.prisma.
String todayDayOfWeek() {
  const names = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  return names[DateTime.now().weekday - 1];
}

const Map<String, String> dayOfWeekLabel = {
  'SUN': 'Sunday',
  'MON': 'Monday',
  'TUE': 'Tuesday',
  'WED': 'Wednesday',
  'THU': 'Thursday',
  'FRI': 'Friday',
  'SAT': 'Saturday',
};
