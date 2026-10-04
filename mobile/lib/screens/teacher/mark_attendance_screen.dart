import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/session.dart';
import '../../core/theme.dart';

/// Campus Admission & Attendance artifact, now real: one tap per student,
/// three states, queued locally and posted as one batch on Submit. "Mark
/// all present" then tapping exceptions is faster than starting blank for
/// a typically-95%-present section.
class MarkAttendanceScreen extends StatefulWidget {
  final dynamic slot;
  const MarkAttendanceScreen({super.key, required this.slot});

  @override
  State<MarkAttendanceScreen> createState() => _MarkAttendanceScreenState();
}

class _MarkAttendanceScreenState extends State<MarkAttendanceScreen> {
  List<Map<String, dynamic>> _roster = [];
  bool _loading = true;
  bool _submitting = false;
  String? _error;
  final _today = DateFormat('yyyy-MM-dd').format(DateTime.now());

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final session = context.read<Session>();
    final sectionId = widget.slot['sectionId'];
    try {
      final students = List.from(await session.api.get('/students?sectionId=$sectionId'));
      final existing = List.from(
        await session.api.get('/attendance?sectionId=$sectionId&from=$_today&to=$_today'),
      );
      final byStudent = {for (final r in existing) if (r['timetableSlotId'] == widget.slot['id']) r['studentId']: r['status']};

      if (!mounted) return;
      setState(() {
        _roster = students
            .map<Map<String, dynamic>>((s) => {
                  'studentId': s['userId'],
                  'name': s['user']['fullName'],
                  'admissionNo': s['admissionNo'],
                  'status': byStudent[s['userId']] ?? 'PRESENT',
                })
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

  void _markAll(String status) {
    setState(() {
      for (final s in _roster) {
        s['status'] = status;
      }
    });
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final session = context.read<Session>();
    try {
      await session.api.post('/attendance', body: {
        'timetableSlotId': widget.slot['id'],
        'onDate': _today,
        'records': _roster.map((s) => {'studentId': s['studentId'], 'status': s['status']}).toList(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Attendance saved for ${_roster.length} students')),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final present = _roster.where((s) => s['status'] == 'PRESENT').length;
    final absent = _roster.where((s) => s['status'] == 'ABSENT').length;
    final late = _roster.where((s) => s['status'] == 'LATE').length;
    final subject = widget.slot['classSubject']['subject']['name'];
    final sectionLabel = '${widget.slot['section']['class']['name']} ${widget.slot['section']['name']}';

    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(
        title: Text('$subject · $sectionLabel'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(22),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              '${widget.slot['startsAt']}–${widget.slot['endsAt']} · $_today',
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
                          _StatChip(label: 'Present', value: present, color: CampusColors.success),
                          const SizedBox(width: 8),
                          _StatChip(label: 'Absent', value: absent, color: CampusColors.danger),
                          const SizedBox(width: 8),
                          _StatChip(label: 'Late', value: late, color: CampusColors.warning),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () => _markAll('PRESENT'),
                          child: const Text('Mark all present'),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
                        itemCount: _roster.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, i) {
                          final s = _roster[i];
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: CampusColors.tealSoft,
                                  child: Text(
                                    s['name'].isNotEmpty ? s['name'][0] : '?',
                                    style: const TextStyle(color: CampusColors.teal, fontWeight: FontWeight.w700, fontSize: 12),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(s['name'], style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                                      Text(s['admissionNo'], style: campusMono(fontSize: 10, color: CampusColors.inkFaint)),
                                    ],
                                  ),
                                ),
                                _AttendanceToggle(
                                  status: s['status'],
                                  onChanged: (v) => setState(() => s['status'] = v),
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
                                : Text('Submit attendance · ${_roster.length} students'),
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
  final int value;
  final Color color;
  const _StatChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: CampusColors.line),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text('$value', style: campusMono(fontSize: 17, fontWeight: FontWeight.w700, color: color)),
            Text(label, style: const TextStyle(fontSize: 9.5, color: CampusColors.inkFaint, letterSpacing: .3)),
          ],
        ),
      ),
    );
  }
}

class _AttendanceToggle extends StatelessWidget {
  final String status;
  final ValueChanged<String> onChanged;
  const _AttendanceToggle({required this.status, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    Widget seg(String code, String label, Color color) {
      final on = status == code;
      return InkWell(
        onTap: () => onChanged(code),
        child: Container(
          width: 30,
          height: 28,
          alignment: Alignment.center,
          color: on ? color : Colors.transparent,
          child: Text(
            label,
            style: campusMono(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: on ? Colors.white : CampusColors.inkFaint,
            ),
          ),
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(7),
      child: Container(
        decoration: BoxDecoration(border: Border.all(color: CampusColors.lineStrong)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            seg('PRESENT', 'P', CampusColors.success),
            Container(width: 1, color: CampusColors.lineStrong),
            seg('ABSENT', 'A', CampusColors.danger),
            Container(width: 1, color: CampusColors.lineStrong),
            seg('LATE', 'L', CampusColors.warning),
          ],
        ),
      ),
    );
  }
}
