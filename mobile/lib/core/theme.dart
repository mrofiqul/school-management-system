import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Ported directly from the Campus brand tokens used across the web
/// artifacts (Campus Schema, Campus API, the two consoles) — same hex
/// values, same three-typeface pairing, so the app reads as the same
/// product rather than a reskin.
class CampusColors {
  static const paper = Color(0xFFF5F3EE);
  static const panel = Color(0xFFFBFAF6);
  static const ink = Color(0xFF20262B);
  static const inkSoft = Color(0xFF5B6269);
  static const inkFaint = Color(0xFF8B8F8A);
  static const line = Color(0xFFD9D4C7);
  static const lineStrong = Color(0xFFC3BCAA);

  static const accent = Color(0xFFA8571F);
  static const accentSoft = Color(0xFFE9DCC3);
  static const teal = Color(0xFF2F6E68);
  static const tealSoft = Color(0xFFDCE8E5);

  static const success = Color(0xFF3C7A5D);
  static const successSoft = Color(0xFFDCEAE1);
  static const warning = Color(0xFFA3791F);
  static const warningSoft = Color(0xFFEFE6CB);
  static const danger = Color(0xFFAE3B32);
  static const dangerSoft = Color(0xFFF3DAD6);
}

class CampusTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: CampusColors.paper,
      colorScheme: ColorScheme.fromSeed(
        seedColor: CampusColors.accent,
        brightness: Brightness.light,
        primary: CampusColors.accent,
        surface: CampusColors.paper,
      ),
    );

    final bodyFont = GoogleFonts.publicSansTextTheme(base.textTheme);

    return base.copyWith(
      textTheme: bodyFont.copyWith(
        headlineSmall: GoogleFonts.newsreader(
          fontSize: 22,
          fontWeight: FontWeight.w600,
          color: CampusColors.ink,
        ),
        titleLarge: GoogleFonts.newsreader(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: CampusColors.ink,
        ),
        bodyMedium: bodyFont.bodyMedium?.copyWith(color: CampusColors.ink),
        bodySmall: bodyFont.bodySmall?.copyWith(color: CampusColors.inkSoft),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: CampusColors.paper,
        foregroundColor: CampusColors.ink,
        elevation: 0,
        titleTextStyle: GoogleFonts.newsreader(
          fontSize: 19,
          fontWeight: FontWeight.w600,
          color: CampusColors.ink,
        ),
      ),
      cardTheme: CardThemeData(
        color: CampusColors.panel,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: const BorderSide(color: CampusColors.line),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: CampusColors.ink,
        indicatorColor: CampusColors.accent,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? Colors.white : CampusColors.inkFaint,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(color: selected ? Colors.white : CampusColors.inkFaint);
        }),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: CampusColors.accent,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: CampusColors.accent,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: GoogleFonts.publicSans(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: CampusColors.panel,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: CampusColors.lineStrong),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: CampusColors.lineStrong),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: CampusColors.teal, width: 2),
        ),
      ),
      dividerTheme: const DividerThemeData(color: CampusColors.line, space: 1),
    );
  }
}

/// IBM Plex Mono — used wherever the web brand uses it: ids, codes,
/// tabular figures (marks, money, percentages).
TextStyle campusMono({double fontSize = 13, FontWeight? fontWeight, Color? color}) {
  return GoogleFonts.ibmPlexMono(fontSize: fontSize, fontWeight: fontWeight, color: color);
}
