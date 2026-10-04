import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/weekday.dart';
import '../../widgets/campus_card.dart';
import 'mark_attendance_screen.dart';

/// The teacher's full weekly schedule — Home only surfaces today, this is
/// where a teacher can reach any period to correct or catch up on
/// attendance from another day.
class TeacherAttendanceTab extends StatefulWidget {
  const TeacherAttendanceTab({super.key});

  @override
  State<TeacherAttendanceTab> createState() => _TeacherAttendanceTabState();
}

class _TeacherAttendanceTabState extends State<TeacherAttendanceTab> {
  List<dynamic>? _slots;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<Session>().api.get('/timetable/mine');
      if (mounted) setState(() => _slots = List.from(data));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final today = todayDayOfWeek();
    final grouped = <String, List<dynamic>>{};
    for (final s in _slots ?? []) {
      (grouped[s['dayOfWeek']] ??= []).add(s);
    }
    const order = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(title: const Text('Attendance')),
      body: _slots == null
          ? Center(child: _error != null ? Text('Could not load: $_error') : const CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_slots!.isEmpty)
                    const CampusCard(child: Text('No classes assigned yet.', style: TextStyle(color: CampusColors.inkFaint))),
                  for (final day in order)
                    if (grouped[day] != null) ...[
                      Padding(
                        padding: const EdgeInsets.only(top: 6, bottom: 8),
                        child: Row(
                          children: [
                            Text(
                              dayOfWeekLabel[day]!,
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: day == today ? CampusColors.accent : CampusColors.ink,
                              ),
                            ),
                            if (day == today) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
                                decoration: BoxDecoration(color: CampusColors.accentSoft, borderRadius: BorderRadius.circular(99)),
                                child: const Text('Today', style: TextStyle(fontSize: 9.5, color: CampusColors.accent, fontWeight: FontWeight.w700)),
                              ),
                            ],
                          ],
                        ),
                      ),
                      for (final slot in grouped[day]!)
                        InkWell(
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => MarkAttendanceScreen(slot: slot)),
                          ),
                          child: CampusCard(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 50,
                                  child: Text(slot['startsAt'], style: campusMono(fontSize: 11.5, color: CampusColors.inkFaint)),
                                ),
                                Expanded(
                                  child: Text(
                                    '${slot['classSubject']['subject']['name']} · ${slot['section']['class']['name']} ${slot['section']['name']}',
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                  ),
                                ),
                                const Icon(Icons.chevron_right, size: 18, color: CampusColors.inkFaint),
                              ],
                            ),
                          ),
                        ),
                    ],
                ],
              ),
            ),
    );
  }
}
