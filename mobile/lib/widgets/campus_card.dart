import 'package:flutter/material.dart';
import '../core/theme.dart';

class CampusCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  const CampusCard({super.key, required this.child, this.padding = const EdgeInsets.all(16)});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: CampusColors.panel,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: CampusColors.line),
      ),
      child: child,
    );
  }
}

class StatusPill extends StatelessWidget {
  final String label;
  final Color fg;
  final Color bg;
  const StatusPill({super.key, required this.label, required this.fg, required this.bg});

  factory StatusPill.forInvoiceStatus(String status) {
    switch (status) {
      case 'PAID':
        return StatusPill(label: 'Paid', fg: CampusColors.success, bg: CampusColors.successSoft);
      case 'OVERDUE':
        return StatusPill(label: 'Overdue', fg: CampusColors.danger, bg: CampusColors.dangerSoft);
      case 'CANCELLED':
        return StatusPill(label: 'Cancelled', fg: CampusColors.inkFaint, bg: CampusColors.line);
      default:
        return StatusPill(label: 'Due', fg: CampusColors.warning, bg: CampusColors.warningSoft);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Text(label, style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}
