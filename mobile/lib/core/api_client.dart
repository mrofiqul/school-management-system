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
/// everything else (web, desktop) really does mean localhost.
class ApiClient {
  static String get _host {
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
  void setToken(String? token) => _accessToken = token;

  Map<String, String> _headers({bool withAuth = true}) {
    final headers = {'Content-Type': 'application/json'};
    if (withAuth && _accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    return headers;
  }

  Future<dynamic> get(String path, {bool withAuth = true}) async {
    final res = await http.get(Uri.parse('$baseUrl$path'), headers: _headers(withAuth: withAuth));
    return _handle(res);
  }

  Future<dynamic> post(String path, {Map<String, dynamic>? body, bool withAuth = true}) async {
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: _headers(withAuth: withAuth),
      body: body == null ? null : jsonEncode(body),
    );
    return _handle(res);
  }

  Future<dynamic> patch(String path, {Map<String, dynamic>? body}) async {
    final res = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: _headers(),
      body: body == null ? null : jsonEncode(body),
    );
    return _handle(res);
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
