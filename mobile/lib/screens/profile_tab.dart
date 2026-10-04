import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/session.dart';
import '../core/theme.dart';
import '../widgets/campus_card.dart';
import 'login_screen.dart';

/// Campus App Flow Figure 5 — Profile. Linked children (and the switch
/// between them) only appears for Parent; a Student's profile ends at
/// account details.
class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final user = session.user!;

    return Scaffold(
      backgroundColor: CampusColors.paper,
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          CampusCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Account', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 10),
                _Row('Email', user.email),
                _Row('Role', user.role),
                if (user.schoolName != null) _Row('School', user.schoolName!),
              ],
            ),
          ),
          if (user.isParent) ...[
            CampusCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Linked children', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 10),
                  for (final child in session.children)
                    RadioListTile<String>(
                      contentPadding: EdgeInsets.zero,
                      value: child.id,
                      groupValue: session.activeChildId,
                      onChanged: (v) => session.setActiveChild(v!),
                      title: Text(child.fullName, style: const TextStyle(fontSize: 13.5)),
                      subtitle: Text(child.admissionNo, style: campusMono(fontSize: 11, color: CampusColors.inkFaint)),
                    ),
                  if (session.children.isEmpty)
                    const Text('No children linked yet.', style: TextStyle(color: CampusColors.inkFaint, fontSize: 13)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () async {
                await session.logout();
                if (context.mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                    (route) => false,
                  );
                }
              },
              child: const Text('Log out'),
            ),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  const _Row(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: CampusColors.inkFaint, fontSize: 12.5)),
          Text(value, style: const TextStyle(fontSize: 13)),
        ],
      ),
    );
  }
}
