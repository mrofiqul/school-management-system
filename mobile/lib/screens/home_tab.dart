import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/session.dart';
import '../core/theme.dart';
import '../widgets/campus_card.dart';
import 'notices_screen.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  Map<String, dynamic>? _attendance;
  List<dynamic> _notices = [];
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
    try {
      // Parent: pass the active child so section/class-scoped notices for
      // *that* child resolve — otherwise the backend only has ALL/ROLE
      // scope to go on, since it never guesses which child you mean.
      final noticesPath = studentId != null && session.user!.isParent
          ? '/notices?studentId=$studentId'
          : '/notices';
      final results = await Future.wait([
        if (studentId != null) session.api.get('/students/$studentId/attendance-summary'),
        session.api.get(noticesPath),
      ]);
      if (!mounted) return;
      setState(() {
        if (studentId != null) {
          _attendance = Map<String, dynamic>.from(results[0]);
          _notices = results.length > 1 ? List.from(results[1]) : [];
        } else {
          _notices = List.from(results[0]);
        }
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
    final session = context.watch<Session>();
    final name = session.user?.email.split('@').first ?? '';

    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const NoticesScreen()),
            ),
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
                    session.user?.schoolName ?? '',
                    style: const TextStyle(color: CampusColors.inkSoft, fontSize: 13),
                  ),
                  const SizedBox(height: 18),
                  if (_error != null)
                    CampusCard(
                      child: Text('Could not load: $_error', style: const TextStyle(color: CampusColors.danger)),
                    ),
                  if (_attendance != null) _AttendanceSummaryCard(data: _attendance!),
                  CampusCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Notices', style: Theme.of(context).textTheme.titleLarge),
                            Text('${_notices.length}', style: campusMono(color: CampusColors.inkFaint)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        if (_notices.isEmpty)
                          const Text('No notices yet.', style: TextStyle(color: CampusColors.inkFaint, fontSize: 13)),
                        for (final n in _notices.take(2)) ...[
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(n['title'], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                                Text(n['body'], maxLines: 2, overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: CampusColors.inkSoft, fontSize: 12.5)),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _AttendanceSummaryCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const _AttendanceSummaryCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final pct = data['presentPercentage'];
    return CampusCard(
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Attendance', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text(
                  pct == null ? 'No records yet' : '$pct% present · ${data['total']} periods recorded',
                  style: const TextStyle(color: CampusColors.inkSoft, fontSize: 12.5),
                ),
              ],
            ),
          ),
          if (pct != null)
            Text(
              '$pct%',
              style: campusMono(fontSize: 22, fontWeight: FontWeight.w700, color: CampusColors.accent),
            ),
        ],
      ),
    );
  }
}
