import 'package:flutter_test/flutter_test.dart';
import 'package:campus_app/core/api_client.dart';

void main() {
  test('baseUrl honors an API_HOST override when given', () {
    const override = String.fromEnvironment('API_HOST');
    if (override.isEmpty) {
      // Run without --dart-define=API_HOST=...: falls back to the normal
      // emulator/web/desktop resolution, which on this test host is
      // "localhost" (Platform.isAndroid is false in the test VM).
      expect(ApiClient.baseUrl, 'http://localhost:3000/v1');
    } else {
      // Run with --dart-define=API_HOST=192.168.1.50 (see the matching
      // test:lan-host script note in mobile/README.md): the override wins.
      expect(ApiClient.baseUrl, 'http://$override:3000/v1');
    }
  });
}
