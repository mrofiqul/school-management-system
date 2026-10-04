import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/api_client.dart';
import 'core/session.dart';
import 'core/theme.dart';
import 'screens/splash_screen.dart';

void main() {
  runApp(const CampusApp());
}

class CampusApp extends StatelessWidget {
  const CampusApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => Session(ApiClient()),
      child: MaterialApp(
        title: 'Campus',
        debugShowCheckedModeBanner: false,
        theme: CampusTheme.light(),
        home: const SplashScreen(),
      ),
    );
  }
}
