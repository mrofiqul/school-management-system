import 'dart:async' show unawaited;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/campus_user.dart';
import 'api_client.dart';

class ChildRef {
  final String id;
  final String fullName;
  final String admissionNo;
  ChildRef({required this.id, required this.fullName, required this.admissionNo});
}

/// Holds everything a screen needs about "who is logged in right now" —
/// the token, the resolved /auth/me profile, and — for a Parent with more
/// than one child — which one is currently active. See Campus App Flow
/// Figure 1: this is the in-memory form of that role+children role check.
class Session extends ChangeNotifier {
  final ApiClient api;
  Session(this.api) {
    // Wires ApiClient's silent-refresh hooks to this session: a successful
    // refresh updates and persists the new pair; a refresh ApiClient
    // couldn't recover from (the refresh token itself was rejected) logs
    // the user out, the same as any other expired-session failure.
    api.onTokensRefreshed = (access, refresh) {
      accessToken = access;
      refreshToken = refresh;
      unawaited(_persist());
      notifyListeners();
    };
    api.onRefreshFailed = logout;
  }

  String? accessToken;
  String? refreshToken;
  CampusUser? user;
  List<ChildRef> children = [];
  String? activeChildId;

  bool get isLoggedIn => accessToken != null && user != null;

  /// The id whose data (attendance, fees, report card...) the current
  /// screen should show: the student themself, or the parent's active child.
  String? get subjectStudentId => user?.isStudent == true ? user!.id : activeChildId;

  Future<void> login(String email, String password) async {
    final data = await api.post(
      '/auth/login',
      body: {'email': email, 'password': password},
      withAuth: false,
    );
    accessToken = data['accessToken'];
    refreshToken = data['refreshToken'];
    api.setToken(accessToken);
    api.setRefreshToken(refreshToken);

    final me = await api.get('/auth/me');
    user = CampusUser.fromJson(me);

    if (user!.isParent) {
      await _loadChildren();
    }

    await _persist();
    notifyListeners();
  }

  Future<void> _loadChildren() async {
    final parent = await api.get('/parents/${user!.id}');
    final list = (parent['children'] as List? ?? []);
    children = list.map((link) {
      final student = link['student'];
      return ChildRef(
        id: link['studentId'],
        fullName: student['user']['fullName'],
        admissionNo: student['admissionNo'],
      );
    }).toList();
    if (children.isNotEmpty) activeChildId = children.first.id;
  }

  void setActiveChild(String studentId) {
    activeChildId = studentId;
    notifyListeners();
  }

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    if (token == null) return;
    accessToken = token;
    refreshToken = prefs.getString('refreshToken');
    api.setToken(accessToken);
    api.setRefreshToken(refreshToken);
    try {
      final me = await api.get('/auth/me');
      user = CampusUser.fromJson(me);
      if (user!.isParent) await _loadChildren();
      notifyListeners();
    } catch (_) {
      await logout(); // stored token no longer valid
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', accessToken ?? '');
    await prefs.setString('refreshToken', refreshToken ?? '');
  }

  Future<void> logout() async {
    if (refreshToken != null) {
      try {
        await api.post('/auth/logout', body: {'refreshToken': refreshToken}, withAuth: false);
      } catch (_) {
        // Best-effort: the token still expires server-side on its own TTL
        // even if this call fails (e.g. offline logout).
      }
    }
    accessToken = null;
    refreshToken = null;
    user = null;
    children = [];
    activeChildId = null;
    api.setToken(null);
    api.setRefreshToken(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('refreshToken');
    notifyListeners();
  }
}
