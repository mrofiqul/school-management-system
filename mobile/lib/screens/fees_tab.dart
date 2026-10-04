import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/session.dart';
import '../core/theme.dart';
import '../widgets/campus_card.dart';

/// Campus App Flow Figure 4. The "Pay now" action only renders for Parent —
/// a Student sees the identical list with no pay button at all, matching
/// the backend: /invoices/:id/checkout is Role.PARENT only.
class FeesTab extends StatefulWidget {
  const FeesTab({super.key});

  @override
  State<FeesTab> createState() => _FeesTabState();
}

class _FeesTabState extends State<FeesTab> {
  List<dynamic>? _invoices;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final session = context.read<Session>();
    final studentId = session.subjectStudentId;
    if (studentId == null) return;
    try {
      final data = await session.api.get('/invoices?studentId=$studentId');
      if (mounted) setState(() => _invoices = List.from(data));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _checkout(String invoiceId) async {
    final session = context.read<Session>();
    try {
      final result = await session.api.post('/invoices/$invoiceId/checkout');
      if (!mounted) return;
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Hosted checkout'),
          content: Text(
            'In production this opens a webview at:\n\n${result['redirectUrl']}\n\n'
            'The invoice updates once the gateway calls back — the app never '
            'marks it paid on its own.',
            style: const TextStyle(fontSize: 13),
          ),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isParent = context.watch<Session>().user?.isParent == true;

    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(title: const Text('Fees')),
      body: _invoices == null
          ? Center(child: _error != null ? Text('Could not load: $_error') : const CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_invoices!.isEmpty)
                    const CampusCard(child: Text('No invoices yet.', style: TextStyle(color: CampusColors.inkFaint))),
                  for (final inv in _invoices!)
                    CampusCard(
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(inv['feeStructure']?['feeType'] ?? 'Fee',
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                const SizedBox(height: 4),
                                Text('৳${inv['amountDueBdt']}', style: campusMono(fontSize: 13)),
                                const SizedBox(height: 6),
                                StatusPill.forInvoiceStatus(inv['status']),
                              ],
                            ),
                          ),
                          if (isParent && inv['status'] != 'PAID')
                            ElevatedButton(
                              onPressed: () => _checkout(inv['id']),
                              child: const Text('Pay now'),
                            ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}
