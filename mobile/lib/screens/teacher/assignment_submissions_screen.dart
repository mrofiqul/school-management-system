import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/session.dart';
import '../../core/theme.dart';
import '../../widgets/campus_card.dart';

class AssignmentSubmissionsScreen extends StatefulWidget {
  final String assignmentId;
  final String title;
  const AssignmentSubmissionsScreen({super.key, required this.assignmentId, required this.title});

  @override
  State<AssignmentSubmissionsScreen> createState() => _AssignmentSubmissionsScreenState();
}

class _AssignmentSubmissionsScreenState extends State<AssignmentSubmissionsScreen> {
  List<dynamic>? _submissions;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<Session>().api.get('/assignments/${widget.assignmentId}/submissions');
      if (mounted) setState(() => _submissions = List.from(data));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _openGradeDialog(dynamic submission) async {
    final marksController = TextEditingController(text: submission['marks']?.toString() ?? '');
    final feedbackController = TextEditingController(text: submission['feedback'] ?? '');
    bool submitting = false;

    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: Text(submission['student']['user']['fullName']),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Marks', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: CampusColors.inkSoft)),
              const SizedBox(height: 6),
              TextField(
                controller: marksController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(hintText: 'e.g. 85'),
              ),
              const SizedBox(height: 14),
              const Text('Feedback (optional)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: CampusColors.inkSoft)),
              const SizedBox(height: 6),
              TextField(controller: feedbackController, maxLines: 3),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
            FilledButton(
              onPressed: submitting
                  ? null
                  : () async {
                      final marks = double.tryParse(marksController.text.trim());
                      if (marks == null) {
                        ScaffoldMessenger.of(dialogContext).showSnackBar(const SnackBar(content: Text('Enter a numeric mark')));
                        return;
                      }
                      setDialogState(() => submitting = true);
                      try {
                        await context.read<Session>().api.patch(
                          '/submissions/${submission['id']}',
                          body: {
                            'marks': marks,
                            if (feedbackController.text.trim().isNotEmpty) 'feedback': feedbackController.text.trim(),
                          },
                        );
                        if (dialogContext.mounted) Navigator.pop(dialogContext, true);
                      } catch (e) {
                        setDialogState(() => submitting = false);
                        if (dialogContext.mounted) {
                          ScaffoldMessenger.of(dialogContext).showSnackBar(SnackBar(content: Text('$e')));
                        }
                      }
                    },
              child: submitting
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save grade'),
            ),
          ],
        ),
      ),
    );
    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(title: Text(widget.title)),
      body: _submissions == null
          ? Center(child: _error != null ? Text('Could not load: $_error') : const CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_submissions!.isEmpty)
                    const CampusCard(child: Text('No submissions yet.', style: TextStyle(color: CampusColors.inkFaint))),
                  for (final s in _submissions!)
                    InkWell(
                      onTap: () => _openGradeDialog(s),
                      child: CampusCard(
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(s['student']['user']['fullName'], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                  const SizedBox(height: 3),
                                  Text(
                                    'Submitted ${s['submittedAt'].toString().substring(0, 10)}',
                                    style: campusMono(fontSize: 11, color: CampusColors.inkFaint),
                                  ),
                                ],
                              ),
                            ),
                            s['marks'] != null
                                ? StatusPill(label: '${s['marks']}', fg: CampusColors.success, bg: CampusColors.successSoft)
                                : const StatusPill(label: 'Ungraded', fg: CampusColors.warning, bg: CampusColors.warningSoft),
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
