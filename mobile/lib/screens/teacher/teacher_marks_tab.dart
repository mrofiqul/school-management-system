import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/campus_card.dart';
import 'enter_marks_screen.dart';

class TeacherMarksTab extends StatefulWidget {
  const TeacherMarksTab({super.key});

  @override
  State<TeacherMarksTab> createState() => _TeacherMarksTabState();
}

class _TeacherMarksTabState extends State<TeacherMarksTab> {
  List<dynamic>? _schedules;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<Session>().api.get('/exam-schedules/mine');
      if (mounted) setState(() => _schedules = List.from(data));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(title: const Text('Marks')),
      body: _schedules == null
          ? Center(child: _error != null ? Text('Could not load: $_error') : const CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_schedules!.isEmpty)
                    const CampusCard(child: Text('No exam schedules assigned yet.', style: TextStyle(color: CampusColors.inkFaint))),
                  for (final sched in _schedules!)
                    InkWell(
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => EnterMarksScreen(schedule: sched)),
                      ),
                      child: CampusCard(
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(sched['exam']['name'], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                  const SizedBox(height: 3),
                                  Text(
                                    '${sched['subject']['name']} · ${sched['class']['name']}',
                                    style: const TextStyle(color: CampusColors.inkSoft, fontSize: 12.5),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    'Held ${sched['heldOn'].toString().substring(0, 10)} · max ${sched['maxMarks']}',
                                    style: campusMono(fontSize: 10.5, color: CampusColors.inkFaint),
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
