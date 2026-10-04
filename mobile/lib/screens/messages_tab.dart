import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/session.dart';
import '../core/theme.dart';
import '../widgets/campus_card.dart';
import 'message_thread_screen.dart';

/// Campus App Flow Figure 5 — Messages, Parent-only. Conversations are
/// derived client-side from the flat /messages list (sender/recipient,
/// no thread id in the schema) by grouping on "the other party".
class MessagesTab extends StatefulWidget {
  const MessagesTab({super.key});

  @override
  State<MessagesTab> createState() => _MessagesTabState();
}

class _MessagesTabState extends State<MessagesTab> {
  List<_Conversation>? _conversations;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final session = context.read<Session>();
    final myId = session.user!.id;
    final data = await session.api.get('/messages');
    final messages = List.from(data);

    final byPartner = <String, _Conversation>{};
    for (final m in messages) {
      final isMine = m['sender']['id'] == myId;
      final partner = isMine ? m['recipient'] : m['sender'];
      final existing = byPartner[partner['id']];
      if (existing == null || DateTime.parse(m['sentAt']).isAfter(existing.lastAt)) {
        byPartner[partner['id']] = _Conversation(
          id: partner['id'],
          name: partner['fullName'],
          role: partner['role'],
          lastBody: m['body'],
          lastAt: DateTime.parse(m['sentAt']),
        );
      }
    }
    final list = byPartner.values.toList()..sort((a, b) => b.lastAt.compareTo(a.lastAt));
    if (mounted) setState(() => _conversations = list);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(title: const Text('Messages')),
      body: _conversations == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_conversations!.isEmpty)
                  const CampusCard(child: Text('No conversations yet.', style: TextStyle(color: CampusColors.inkFaint))),
                for (final c in _conversations!)
                  InkWell(
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => MessageThreadScreen(otherUserId: c.id, otherUserName: c.name),
                      ),
                    ),
                    child: CampusCard(
                      child: Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: CampusColors.tealSoft,
                            child: Text(
                              c.name.isNotEmpty ? c.name[0] : '?',
                              style: const TextStyle(color: CampusColors.teal, fontWeight: FontWeight.w700),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                                Text(
                                  c.lastBody,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: CampusColors.inkSoft, fontSize: 12.5),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

class _Conversation {
  final String id;
  final String name;
  final String role;
  final String lastBody;
  final DateTime lastAt;
  _Conversation({required this.id, required this.name, required this.role, required this.lastBody, required this.lastAt});
}
