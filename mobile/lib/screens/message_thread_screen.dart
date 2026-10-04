import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/session.dart';
import '../core/theme.dart';

class MessageThreadScreen extends StatefulWidget {
  final String otherUserId;
  final String otherUserName;
  const MessageThreadScreen({super.key, required this.otherUserId, required this.otherUserName});

  @override
  State<MessageThreadScreen> createState() => _MessageThreadScreenState();
}

class _MessageThreadScreenState extends State<MessageThreadScreen> {
  List<dynamic> _messages = [];
  bool _loading = true;
  final _inputCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final session = context.read<Session>();
    final data = await session.api.get('/messages?with=${widget.otherUserId}');
    if (mounted) {
      setState(() {
        _messages = List.from(data);
        _loading = false;
      });
    }
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty) return;
    _inputCtrl.clear();
    final session = context.read<Session>();
    await session.api.post('/messages', body: {'recipientId': widget.otherUserId, 'body': text});
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final myId = context.read<Session>().user!.id;
    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(title: Text(widget.otherUserName)),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(14),
                    children: [
                      for (final m in _messages) _Bubble(mine: m['senderId'] == myId, text: m['body']),
                    ],
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _inputCtrl,
                      decoration: const InputDecoration(hintText: 'Write a message…'),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(onPressed: _send, icon: const Icon(Icons.send)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  final bool mine;
  final String text;
  const _Bubble({required this.mine, required this.text});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
        constraints: const BoxConstraints(maxWidth: 280),
        decoration: BoxDecoration(
          color: mine ? CampusColors.accent : CampusColors.panel,
          border: mine ? null : Border.all(color: CampusColors.line),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(text, style: TextStyle(color: mine ? Colors.white : CampusColors.ink, fontSize: 13)),
      ),
    );
  }
}
