import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/session.dart';
import 'home_tab.dart';
import 'academics_tab.dart';
import 'fees_tab.dart';
import 'messages_tab.dart';
import 'profile_tab.dart';
import 'teacher/teacher_home_tab.dart';
import 'teacher/teacher_attendance_tab.dart';
import 'teacher/teacher_marks_tab.dart';

/// Campus App Flow Figure 0: the nav bar itself is role-conditional, not
/// just its content. Three distinct shapes, one per role:
///   Student  — Home · Academics · Fees · Profile              (4 tabs)
///   Parent   — Home · Academics · Fees · Messages · Profile   (5 tabs)
///   Teacher  — Home · Attendance · Marks · Messages · Profile (5 tabs)
/// matching exactly what each role's token is allowed to call on the
/// backend — a Student token is never accepted on /messages, a Teacher
/// has no /invoices access at all, and so on.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<Session>().user!;

    late final List<NavigationDestination> destinations;
    late final List<Widget> pages;

    if (user.isTeacher) {
      destinations = const [
        NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
        NavigationDestination(icon: Icon(Icons.fact_check_outlined), selectedIcon: Icon(Icons.fact_check), label: 'Attendance'),
        NavigationDestination(icon: Icon(Icons.edit_note_outlined), selectedIcon: Icon(Icons.edit_note), label: 'Marks'),
        NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Messages'),
        NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
      ];
      pages = const [
        TeacherHomeTab(),
        TeacherAttendanceTab(),
        TeacherMarksTab(),
        MessagesTab(),
        ProfileTab(),
      ];
    } else {
      final isParent = user.isParent;
      destinations = [
        const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
        const NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book), label: 'Academics'),
        const NavigationDestination(icon: Icon(Icons.payments_outlined), selectedIcon: Icon(Icons.payments), label: 'Fees'),
        if (isParent)
          const NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Messages'),
        const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
      ];
      pages = [
        const HomeTab(),
        const AcademicsTab(),
        const FeesTab(),
        if (isParent) const MessagesTab(),
        const ProfileTab(),
      ];
    }

    if (_index >= pages.length) _index = 0;

    return Scaffold(
      body: SafeArea(child: pages[_index]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: destinations,
      ),
    );
  }
}
