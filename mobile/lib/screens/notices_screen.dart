import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/session.dart';
import '../core/theme.dart';
import '../widgets/campus_card.dart';

class NoticesScreen extends StatefulWidget {
  const NoticesScreen({super.key});

  @override
  State<NoticesScreen> createState() => _NoticesScreenState();
}

class _NoticesScreenState extends State<NoticesScreen> {
  List<dynamic>? _notices;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final session = context.read<Session>();
    final studentId = session.subjectStudentId;
    final path = studentId != null && session.user!.isParent
        ? '/notices?studentId=$studentId'
        : '/notices';
    final data = await session.api.get(path);
    if (mounted) setState(() => _notices = List.from(data));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(title: const Text('Notices')),
      body: _notices == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                for (final n in _notices!)
                  CampusCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(n['title'], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                        const SizedBox(height: 6),
                        Text(n['body'], style: const TextStyle(color: CampusColors.inkSoft, fontSize: 13)),
                        const SizedBox(height: 8),
                        Text(
                          n['audienceScope'],
                          style: campusMono(fontSize: 10.5, color: CampusColors.inkFaint),
                        ),
                      ],
                    ),
                  ),
                if (_notices!.isEmpty) const Text('No notices.', style: TextStyle(color: CampusColors.inkFaint)),
              ],
            ),
    );
  }
}
