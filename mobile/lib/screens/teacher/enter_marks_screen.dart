import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/session.dart';
import '../../core/theme.dart';

class _Row {
  final String studentId;
  final String name;
  final String admissionNo;
  final TextEditingController controller;
  _Row({required this.studentId, required this.name, required this.admissionNo, String? initialMarks})
      : controller = TextEditingController(text: initialMarks ?? '');
}

({String label, Color fg, Color bg}) _gradeFor(double? marks, double maxMarks) {
  if (marks == null) return (label: '—', fg: CampusColors.inkFaint, bg: CampusColors.line);
  final pct = maxMarks == 0 ? 0 : (marks / maxMarks) * 100;
  if (pct >= 80) return (label: 'A+', fg: CampusColors.success, bg: CampusColors.successSoft);
  if (pct >= 70) return (label: 'A', fg: CampusColors.success, bg: CampusColors.successSoft);
  if (pct >= 60) return (label: 'A-', fg: CampusColors.teal, bg: CampusColors.tealSoft);
  if (pct >= 50) return (label: 'B', fg: CampusColors.teal, bg: CampusColors.tealSoft);
  if (pct >= 40) return (label: 'C', fg: CampusColors.warning, bg: CampusColors.warningSoft);
  if (pct >= 33) return (label: 'D', fg: CampusColors.warning, bg: CampusColors.warningSoft);
  return (label: 'F', fg: CampusColors.danger, bg: CampusColors.dangerSoft);
}

/// Campus Exams & Messaging artifact, now real: grade computed the moment
/// a number is typed, against the same A+–F scale the student's report
/// card uses — a teacher sees the grade they're giving, not just the
/// score, before moving to the next row.
class EnterMarksScreen extends StatefulWidget {
  final dynamic schedule;
  const EnterMarksScreen({super.key, required this.schedule});

  @override
  State<EnterMarksScreen> createState() => _EnterMarksScreenState();
}

class _EnterMarksScreenState extends State<EnterMarksScreen> {
  List<_Row> _rows = [];
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  double get _maxMarks => double.tryParse(widget.schedule['maxMarks'].toString()) ?? 100;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final session = context.read<Session>();
    final classId = widget.schedule['classId'];
    final scheduleId = widget.schedule['id'];
    try {
      final students = List.from(await session.api.get('/students?classId=$classId'));
      final marks = List.from(await session.api.get('/exam-schedules/$scheduleId/marks'));
      final byStudent = {for (final m in marks) m['studentId']: m['marksObtained'].toString()};

      if (!mounted) return;
      setState(() {
        _rows = students
            .map<_Row>((s) => _Row(
                  studentId: s['userId'],
                  name: s['user']['fullName'],
                  admissionNo: s['admissionNo'],
                  initialMarks: byStudent[s['userId']],
                ))
            .toList();
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

  Future<void> _submit() async {
    final records = <Map<String, dynamic>>[];
    for (final r in _rows) {
      final val = double.tryParse(r.controller.text);
      if (val == null) continue;
      records.add({
        'studentId': r.studentId,
        'marksObtained': val,
        'gradeLetter': _gradeFor(val, _maxMarks).label,
      });
    }
    if (records.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter at least one mark')));
      return;
    }
    setState(() => _submitting = true);
    try {
      await context.read<Session>().api.post(
        '/exam-schedules/${widget.schedule['id']}/marks',
        body: {'records': records},
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Saved ${records.length} marks')));
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final entered = _rows.where((r) => double.tryParse(r.controller.text) != null).toList();
    final values = entered.map((r) => double.parse(r.controller.text)).toList();
    final avg = values.isEmpty ? null : values.reduce((a, b) => a + b) / values.length;
    final high = values.isEmpty ? null : values.reduce((a, b) => a > b ? a : b);
    final low = values.isEmpty ? null : values.reduce((a, b) => a < b ? a : b);

    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(
        title: Text('${widget.schedule['exam']['name']} · ${widget.schedule['subject']['name']}'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(22),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              '${widget.schedule['class']['name']} · max ${widget.schedule['maxMarks']}',
              style: const TextStyle(color: CampusColors.inkSoft, fontSize: 12),
            ),
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Could not load: $_error'))
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                      child: Row(
                        children: [
                          _StatChip(label: 'Average', value: avg?.toStringAsFixed(1) ?? '—'),
                          const SizedBox(width: 8),
                          _StatChip(label: 'Highest', value: high?.toStringAsFixed(0) ?? '—'),
                          const SizedBox(width: 8),
                          _StatChip(label: 'Lowest', value: low?.toStringAsFixed(0) ?? '—'),
                          const SizedBox(width: 8),
                          _StatChip(label: 'Entered', value: '${entered.length}/${_rows.length}'),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
                        itemCount: _rows.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, i) {
                          final r = _rows[i];
                          final val = double.tryParse(r.controller.text);
                          final grade = _gradeFor(val, _maxMarks);
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(r.name, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                                      Text(r.admissionNo, style: campusMono(fontSize: 10, color: CampusColors.inkFaint)),
                                    ],
                                  ),
                                ),
                                SizedBox(
                                  width: 68,
                                  child: TextField(
                                    controller: r.controller,
                                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                    textAlign: TextAlign.right,
                                    style: campusMono(fontSize: 13),
                                    decoration: const InputDecoration(
                                      contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                      isDense: true,
                                    ),
                                    onChanged: (_) => setState(() {}),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Container(
                                  width: 38,
                                  padding: const EdgeInsets.symmetric(vertical: 4),
                                  decoration: BoxDecoration(color: grade.bg, borderRadius: BorderRadius.circular(99)),
                                  alignment: Alignment.center,
                                  child: Text(
                                    grade.label,
                                    style: campusMono(fontSize: 11, fontWeight: FontWeight.w700, color: grade.fg),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                    SafeArea(
                      top: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                        child: SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _submitting ? null : _submit,
                            child: _submitting
                                ? const SizedBox(
                                    height: 18, width: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Save marks'),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  const _StatChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(border: Border.all(color: CampusColors.line), borderRadius: BorderRadius.circular(8)),
        child: Column(
          children: [
            Text(value, style: campusMono(fontSize: 14, fontWeight: FontWeight.w700, color: CampusColors.accent)),
            Text(label, style: const TextStyle(fontSize: 9, color: CampusColors.inkFaint)),
          ],
        ),
      ),
    );
  }
}
