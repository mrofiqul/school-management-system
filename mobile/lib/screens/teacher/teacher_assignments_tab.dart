import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/campus_card.dart';
import 'class_subject_assignments_screen.dart';

/// A teacher may teach the same class-subject across several sections, but
/// assignments are posted once per class-subject (Assignment.classSubjectId
/// — not per section), so this list is deduped from /timetable/mine by
/// classSubjectId rather than showing one row per timetable slot.
class TeacherAssignmentsTab extends StatefulWidget {
  const TeacherAssignmentsTab({super.key});

  @override
  State<TeacherAssignmentsTab> createState() => _TeacherAssignmentsTabState();
}

class _TeacherAssignmentsTabState extends State<TeacherAssignmentsTab> {
  List<Map<String, String>>? _classSubjects;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final slots = List.from(await context.read<Session>().api.get('/timetable/mine'));
      final seen = <String>{};
      final deduped = <Map<String, String>>[];
      for (final slot in slots) {
        final id = slot['classSubjectId'] as String;
        if (!seen.add(id)) continue;
        deduped.add({
          'classSubjectId': id,
          'subject': slot['classSubject']['subject']['name'] as String,
          'className': slot['section']['class']['name'] as String,
        });
      }
      deduped.sort((a, b) => '${a['className']}${a['subject']}'.compareTo('${b['className']}${b['subject']}'));
      if (mounted) setState(() => _classSubjects = deduped);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(title: const Text('Assignments')),
      body: _classSubjects == null
          ? Center(child: _error != null ? Text('Could not load: $_error') : const CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_classSubjects!.isEmpty)
                    const CampusCard(child: Text('No classes assigned yet.', style: TextStyle(color: CampusColors.inkFaint))),
                  for (final cs in _classSubjects!)
                    InkWell(
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ClassSubjectAssignmentsScreen(
                            classSubjectId: cs['classSubjectId']!,
                            subject: cs['subject']!,
                            className: cs['className']!,
                          ),
                        ),
                      ),
                      child: CampusCard(
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(cs['subject']!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                  const SizedBox(height: 3),
                                  Text(cs['className']!, style: const TextStyle(color: CampusColors.inkSoft, fontSize: 12.5)),
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
