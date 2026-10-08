import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override
  String toString() => message;
}

/// Talks to the Campus API (see ../../../../backend). Android's emulator
/// can't reach the host machine via `localhost` — it has to go through the
/// special `10.0.2.2` loopback alias — so that's the default for Android;
/// everything else (web, desktop) really does mean localhost. Neither works
/// from a *physical* Android device on the same LAN, since there's no
/// emulator loopback and the device's own `localhost` is itself, not the
/// dev machine — that needs the dev machine's real LAN IP, which only the
/// developer running this build knows, so it's a build-time override:
/// `flutter run --dart-define=API_HOST=192.168.x.x` (see mobile/README.md).
class ApiClient {
  static String get _host {
    const override = String.fromEnvironment('API_HOST');
    if (override.isNotEmpty) return override;
    if (kIsWeb) return 'localhost';
    try {
      if (Platform.isAndroid) return '10.0.2.2';
    } catch (_) {
      // Platform.* throws on web, already handled by the kIsWeb check above.
    }
    return 'localhost';
  }

  static String get baseUrl => 'http://$_host:3000/v1';

  String? _accessToken;
  String? _refreshToken;
  void setToken(String? token) => _accessToken = token;
  void setRefreshToken(String? token) => _refreshToken = token;

  /// Set by Session: called with the new (accessToken, refreshToken) right
  /// after a silent refresh succeeds, so Session can persist the new pair —
  /// without this, a refreshed token would work for the rest of this app
  /// run but vanish on next launch, since only Session writes to storage.
  void Function(String accessToken, String refreshToken)? onTokensRefreshed;

  /// Set by Session: called when a 401 couldn't be recovered because the
  /// refresh token itself is invalid, expired, or already rotated past —
  /// Session logs the user out in response.
  Future<void> Function()? onRefreshFailed;

  // Concurrent 401s share one in-flight refresh instead of each firing
  // their own /auth/refresh call (which would race the single-use rotation
  // and fail every call after the first).
  Future<bool>? _refreshFuture;

  Future<dynamic> get(String path, {bool withAuth = true}) =>
      _request('GET', path, withAuth: withAuth);

  Future<dynamic> post(String path, {Map<String, dynamic>? body, bool withAuth = true}) =>
      _request('POST', path, body: body, withAuth: withAuth);

  Future<dynamic> patch(String path, {Map<String, dynamic>? body}) =>
      _request('PATCH', path, body: body, withAuth: true);

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool withAuth = true,
  }) async {
    final res = await _send(method, path, body: body, withAuth: withAuth);

    // Only an authenticated call can be saved by a refresh, and /auth/* calls
    // are never retried this way — a failed login or refresh isn't a stale
    // access token, it's just a failed login or refresh.
    if (res.statusCode == 401 && withAuth && !path.startsWith('/auth/')) {
      final refreshed = await _tryRefresh();
      if (refreshed) {
        final retried = await _send(method, path, body: body, withAuth: withAuth);
        return _handle(retried);
      }
    }
    return _handle(res);
  }

  Future<http.Response> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool withAuth = true,
  }) {
    final uri = Uri.parse('$baseUrl$path');
    final headers = _headers(withAuth: withAuth);
    final encodedBody = body == null ? null : jsonEncode(body);
    switch (method) {
      case 'POST':
        return http.post(uri, headers: headers, body: encodedBody);
      case 'PATCH':
        return http.patch(uri, headers: headers, body: encodedBody);
      default:
        return http.get(uri, headers: headers);
    }
  }

  Future<bool> _tryRefresh() {
    return _refreshFuture ??= _doRefresh().whenComplete(() => _refreshFuture = null);
  }

  Future<bool> _doRefresh() async {
    final token = _refreshToken;
    if (token == null) return false;
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': token}),
      );
      if (res.statusCode < 200 || res.statusCode >= 300) {
        await onRefreshFailed?.call();
        return false;
      }
      final decoded = jsonDecode(res.body) as Map<String, dynamic>;
      final newAccess = decoded['accessToken'] as String;
      final newRefresh = decoded['refreshToken'] as String;
      _accessToken = newAccess;
      _refreshToken = newRefresh;
      onTokensRefreshed?.call(newAccess, newRefresh);
      return true;
    } catch (_) {
      // Network failure, not a rejected token — don't log the user out over
      // a dropped connection; just let this request fail as a plain 401.
      return false;
    }
  }

  Map<String, String> _headers({bool withAuth = true}) {
    final headers = {'Content-Type': 'application/json'};
    if (withAuth && _accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    return headers;
  }

  dynamic _handle(http.Response res) {
    final decoded = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return decoded is Map && decoded.containsKey('data') ? decoded['data'] : decoded;
    }
    final message = (decoded is Map && decoded['message'] != null)
        ? (decoded['message'] is List ? decoded['message'].join(', ') : decoded['message'].toString())
        : 'Request failed (${res.statusCode})';
    throw ApiException(res.statusCode, message);
  }
}
