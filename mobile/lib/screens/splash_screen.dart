import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/session.dart';
import '../core/theme.dart';
import 'login_screen.dart';
import 'app_shell.dart';

/// Campus App Flow Figure 1: Splash → (restore a known device silently) →
/// Login or straight to Home.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _boot());
  }

  Future<void> _boot() async {
    final session = context.read<Session>();
    await session.restore();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => session.isLoggedIn ? const AppShell() : const LoginScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: CampusColors.paper,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('◆', style: TextStyle(fontSize: 40, color: CampusColors.accent)),
            SizedBox(height: 12),
            Text(
              'Campus',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: CampusColors.ink,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
