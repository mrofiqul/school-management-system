import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/session.dart';
import '../../core/theme.dart';

class CreateAssignmentScreen extends StatefulWidget {
  final String classSubjectId;
  final String subject;
  final String className;
  const CreateAssignmentScreen({
    super.key,
    required this.classSubjectId,
    required this.subject,
    required this.className,
  });

  @override
  State<CreateAssignmentScreen> createState() => _CreateAssignmentScreenState();
}

class _CreateAssignmentScreenState extends State<CreateAssignmentScreen> {
  final _titleController = TextEditingController();
  final _attachmentController = TextEditingController();
  DateTime? _dueOn;
  bool _submitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _attachmentController.dispose();
    super.dispose();
  }

  Future<void> _pickDueDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueOn ?? now.add(const Duration(days: 7)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _dueOn = picked);
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a title')));
      return;
    }
    if (_dueOn == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick a due date')));
      return;
    }
    setState(() => _submitting = true);
    try {
      await context.read<Session>().api.post(
        '/class-subjects/${widget.classSubjectId}/assignments',
        body: {
          'title': title,
          'dueOn': _dueOn!.toIso8601String().substring(0, 10),
          if (_attachmentController.text.trim().isNotEmpty) 'attachmentUrl': _attachmentController.text.trim(),
        },
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(title: Text('New assignment · ${widget.subject}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(widget.className, style: const TextStyle(color: CampusColors.inkSoft, fontSize: 12.5)),
          const SizedBox(height: 18),
          const Text('Title', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: CampusColors.inkSoft)),
          const SizedBox(height: 6),
          TextField(
            controller: _titleController,
            decoration: const InputDecoration(hintText: 'e.g. Chapter 4 worksheet'),
          ),
          const SizedBox(height: 16),
          const Text('Due date', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: CampusColors.inkSoft)),
          const SizedBox(height: 6),
          InkWell(
            onTap: _pickDueDate,
            borderRadius: BorderRadius.circular(8),
            child: InputDecorator(
              decoration: const InputDecoration(),
              child: Text(
                _dueOn == null ? 'Tap to choose' : _dueOn!.toIso8601String().substring(0, 10),
                style: TextStyle(color: _dueOn == null ? CampusColors.inkFaint : CampusColors.ink),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Attachment URL (optional)',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: CampusColors.inkSoft),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _attachmentController,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(hintText: 'https://…'),
          ),
          const SizedBox(height: 28),
          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Post assignment'),
          ),
        ],
      ),
    );
  }
}
