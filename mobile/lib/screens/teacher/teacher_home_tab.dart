import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../core/weekday.dart';
import '../../widgets/campus_card.dart';
import '../notices_screen.dart';
import 'mark_attendance_screen.dart';

/// A teacher's day at a glance: just today's periods, each one tap away
/// from attendance — the single most-repeated action in the app (Campus
/// Admission & Attendance artifact: "this is the screen a teacher opens
/// almost every working day").
class TeacherHomeTab extends StatefulWidget {
  const TeacherHomeTab({super.key});

  @override
  State<TeacherHomeTab> createState() => _TeacherHomeTabState();
}

class _TeacherHomeTabState extends State<TeacherHomeTab> {
  List<dynamic>? _today;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final session = context.read<Session>();
    try {
      final data = await session.api.get('/timetable/mine');
      final all = List.from(data);
      final today = todayDayOfWeek();
      if (!mounted) return;
      setState(() {
        _today = all.where((s) => s['dayOfWeek'] == today).toList()
          ..sort((a, b) => (a['startsAt'] as String).compareTo(b['startsAt'] as String));
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = context.watch<Session>().user?.email.split('@').first ?? '';

    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NoticesScreen())),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text('Hi, $name', style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 4),
                  Text(
                    context.read<Session>().user?.schoolName ?? '',
                    style: const TextStyle(color: CampusColors.inkSoft, fontSize: 13),
                  ),
                  const SizedBox(height: 18),
                  Text("Today's classes", style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 10),
                  if (_error != null)
                    CampusCard(child: Text('Could not load: $_error', style: const TextStyle(color: CampusColors.danger))),
                  if (_today != null && _today!.isEmpty)
                    const CampusCard(child: Text('No classes today.', style: TextStyle(color: CampusColors.inkFaint))),
                  if (_today != null)
                    for (final slot in _today!)
                      InkWell(
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => MarkAttendanceScreen(slot: slot)),
                        ),
                        child: CampusCard(
                          child: Row(
                            children: [
                              Container(
                                width: 4,
                                height: 40,
                                decoration: BoxDecoration(color: CampusColors.accent, borderRadius: BorderRadius.circular(2)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${slot['classSubject']['subject']['name']} · ${slot['section']['class']['name']} ${slot['section']['name']}',
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                                    ),
                                    Text(
                                      '${slot['startsAt']} – ${slot['endsAt']}${slot['room'] != null ? ' · Room ${slot['room']}' : ''}',
                                      style: const TextStyle(color: CampusColors.inkSoft, fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(Icons.chevron_right, color: CampusColors.inkFaint),
                            ],
                          ),
                        ),
                      ),
                ],
              ),
            ),
    );
  }
}
