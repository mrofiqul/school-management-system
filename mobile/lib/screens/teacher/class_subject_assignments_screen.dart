import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/campus_card.dart';
import 'create_assignment_screen.dart';
import 'assignment_submissions_screen.dart';

class ClassSubjectAssignmentsScreen extends StatefulWidget {
  final String classSubjectId;
  final String subject;
  final String className;
  const ClassSubjectAssignmentsScreen({
    super.key,
    required this.classSubjectId,
    required this.subject,
    required this.className,
  });

  @override
  State<ClassSubjectAssignmentsScreen> createState() => _ClassSubjectAssignmentsScreenState();
}

class _ClassSubjectAssignmentsScreenState extends State<ClassSubjectAssignmentsScreen> {
  List<dynamic>? _assignments;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<Session>().api.get('/class-subjects/${widget.classSubjectId}/assignments');
      if (mounted) setState(() => _assignments = List.from(data));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _openCreate() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => CreateAssignmentScreen(
          classSubjectId: widget.classSubjectId,
          subject: widget.subject,
          className: widget.className,
        ),
      ),
    );
    if (created == true) _load();
  }

  bool _isOverdue(String dueOn) {
    final due = DateTime.tryParse(dueOn);
    return due != null && due.isBefore(DateTime.now());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(
        title: Text(widget.subject),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(22),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(widget.className, style: const TextStyle(color: CampusColors.inkSoft, fontSize: 12)),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        icon: const Icon(Icons.add),
        label: const Text('New assignment'),
      ),
      body: _assignments == null
          ? Center(child: _error != null ? Text('Could not load: $_error') : const CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                children: [
                  if (_assignments!.isEmpty)
                    const CampusCard(child: Text('No assignments posted yet.', style: TextStyle(color: CampusColors.inkFaint))),
                  for (final a in _assignments!)
                    InkWell(
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => AssignmentSubmissionsScreen(assignmentId: a['id'], title: a['title']),
                        ),
                      ),
                      child: CampusCard(
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(a['title'], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Due ${a['dueOn'].toString().substring(0, 10)}',
                                    style: campusMono(
                                      fontSize: 11,
                                      color: _isOverdue(a['dueOn']) ? CampusColors.danger : CampusColors.inkFaint,
                                    ),
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
