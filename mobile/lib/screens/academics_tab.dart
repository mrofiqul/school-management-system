import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/session.dart';
import '../core/theme.dart';
import '../widgets/campus_card.dart';

/// Campus App Flow Figure 3. This first pass surfaces the report card —
/// the richest of the Academics screens — real marks from Mark rows
/// summed live, exactly as /students/:id/report-card computes them.
class AcademicsTab extends StatefulWidget {
  const AcademicsTab({super.key});

  @override
  State<AcademicsTab> createState() => _AcademicsTabState();
}

class _AcademicsTabState extends State<AcademicsTab> {
  Map<String, dynamic>? _reportCard;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final session = context.read<Session>();
    final studentId = session.subjectStudentId;
    if (studentId == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final data = await session.api.get('/students/$studentId/report-card');
      if (!mounted) return;
      setState(() {
        _reportCard = Map<String, dynamic>.from(data);
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
    final exams = (_reportCard?['exams'] as List?) ?? [];

    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(title: const Text('Academics')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Could not load: $_error'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text('Report card', style: Theme.of(context).textTheme.headlineSmall),
                      const SizedBox(height: 4),
                      const Text(
                        'Computed from marks as they\'re entered — never a stored document.',
                        style: TextStyle(color: CampusColors.inkSoft, fontSize: 12.5),
                      ),
                      const SizedBox(height: 16),
                      if (exams.isEmpty)
                        const CampusCard(child: Text('No exams recorded yet.', style: TextStyle(color: CampusColors.inkFaint))),
                      for (final exam in exams) _ExamCard(exam: exam),
                    ],
                  ),
                ),
    );
  }
}

class _ExamCard extends StatelessWidget {
  final dynamic exam;
  const _ExamCard({required this.exam});

  @override
  Widget build(BuildContext context) {
    final subjects = (exam['subjects'] as List?) ?? [];
    final pct = exam['percentage'];
    return CampusCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(exam['examName'] ?? '', style: Theme.of(context).textTheme.titleLarge),
              Text(
                '${exam['total']}/${exam['maxTotal']}',
                style: campusMono(fontWeight: FontWeight.w700, color: CampusColors.accent),
              ),
            ],
          ),
          if (pct != null)
            Text('$pct% overall', style: const TextStyle(color: CampusColors.inkSoft, fontSize: 12)),
          const SizedBox(height: 12),
          for (final s in subjects) _SubjectRow(subject: s),
        ],
      ),
    );
  }
}

class _SubjectRow extends StatelessWidget {
  final dynamic subject;
  const _SubjectRow({required this.subject});

  @override
  Widget build(BuildContext context) {
    final obtained = (subject['marksObtained'] as num).toDouble();
    final max = (subject['maxMarks'] as num).toDouble();
    final frac = max == 0 ? 0.0 : (obtained / max).clamp(0, 1).toDouble();

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          SizedBox(
            width: 82,
            child: Text(
              subject['subject'],
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11.5, color: CampusColors.inkSoft),
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: frac,
                minHeight: 7,
                backgroundColor: CampusColors.line,
                valueColor: const AlwaysStoppedAnimation(CampusColors.accent),
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 48,
            child: Text('${obtained.toInt()}', textAlign: TextAlign.right, style: campusMono(fontSize: 12)),
          ),
          const SizedBox(width: 8),
          if (subject['gradeLetter'] != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(color: CampusColors.successSoft, borderRadius: BorderRadius.circular(99)),
              child: Text(
                subject['gradeLetter'],
                style: campusMono(fontSize: 10.5, fontWeight: FontWeight.w700, color: CampusColors.success),
              ),
            ),
        ],
      ),
    );
  }
}
