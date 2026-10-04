import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/session.dart';
import '../core/theme.dart';
import 'app_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController(text: 'mahin.guardian@example.com');
  final _passwordCtrl = TextEditingController(text: 'StudentPass1');
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<Session>().login(_emailCtrl.text.trim(), _passwordCtrl.text);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const AppShell()));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Could not reach the server. Is the backend running?');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CampusColors.paper,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('◆', style: TextStyle(fontSize: 32, color: CampusColors.accent)),
              const SizedBox(height: 8),
              Text('Welcome back', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              const Text(
                'Sign in to see attendance, grades, fees, and notices.',
                style: TextStyle(color: CampusColors.inkSoft, fontSize: 13.5),
              ),
              const SizedBox(height: 28),
              TextField(
                controller: _emailCtrl,
                decoration: const InputDecoration(labelText: 'Email'),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _passwordCtrl,
                decoration: const InputDecoration(labelText: 'Password'),
                obscureText: true,
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: CampusColors.dangerSoft,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(_error!, style: const TextStyle(color: CampusColors.danger, fontSize: 12.5)),
                ),
              ],
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Log in'),
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Try: mahin.guardian@example.com (student) or\nrina.ahmed@example.com (parent) — both seeded in the backend.',
                style: TextStyle(color: CampusColors.inkFaint, fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
