import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'api_client.dart';
import 'theme.dart';

/// Bumped by hand alongside pubspec.yaml's `version:` on every release —
/// compared against the backend's GET /app-version (see
/// backend/src/app.controller.ts) so nudging users to upgrade is just an
/// env var change on Render, never a new app release of its own.
const String kAppVersion = '1.0.0';

/// Returns negative/zero/positive the way Comparable does, comparing
/// dotted version strings component-by-component (missing components
/// treated as 0, so "1.2" == "1.2.0").
int compareAppVersions(String a, String b) {
  final pa = a.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  final pb = b.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  for (var i = 0; i < 3; i++) {
    final va = i < pa.length ? pa[i] : 0;
    final vb = i < pb.length ? pb[i] : 0;
    if (va != vb) return va - vb;
  }
  return 0;
}

/// Called once per app session, right after login or a silent session
/// restore (see AppShell.initState). Fails silently on any error — a flaky
/// network or an older backend that doesn't have this route yet should
/// never block someone from using the app they already have installed.
Future<void> checkForAppUpdate(BuildContext context, ApiClient api) async {
  try {
    final data = await api.get('/app-version', withAuth: false) as Map;
    final latest = data['latestVersion'] as String;
    final minSupported = data['minSupportedVersion'] as String;
    final downloadUrl = data['downloadUrl'] as String;

    if (compareAppVersions(kAppVersion, latest) >= 0) return; // already current

    final mandatory = compareAppVersions(kAppVersion, minSupported) < 0;
    if (!context.mounted) return;

    await showDialog<void>(
      context: context,
      barrierDismissible: !mandatory,
      builder: (ctx) => PopScope(
        canPop: !mandatory,
        child: AlertDialog(
          title: Text(mandatory ? 'Update required' : 'Update available'),
          content: Text(
            mandatory
                ? 'This version of Campus is no longer supported. Update to v$latest to keep using the app.'
                : 'A new version of Campus (v$latest) is available.',
          ),
          actions: [
            if (!mandatory)
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Later'),
              ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: CampusColors.accent),
              onPressed: () async {
                await launchUrl(Uri.parse(downloadUrl), mode: LaunchMode.externalApplication);
                if (!mandatory && ctx.mounted) Navigator.of(ctx).pop();
              },
              child: const Text('Update now'),
            ),
          ],
        ),
      ),
    );
  } catch (_) {
    // See doc comment above — never block on this.
  }
}
