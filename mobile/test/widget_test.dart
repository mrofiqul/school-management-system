// Smoke test: the app boots to the splash screen without throwing.
// Login/API-backed screens aren't exercised here — those were verified
// manually against the real backend instead (see mobile/README.md).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:campus_app/main.dart';

void main() {
  testWidgets('App boots to splash screen', (WidgetTester tester) async {
    await tester.pumpWidget(const CampusApp());
    await tester.pump();

    expect(find.text('Campus'), findsOneWidget);
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
