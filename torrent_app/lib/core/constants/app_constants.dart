class AppConstants {
  // API Configuration
  static const String baseUrl = 'http://localhost:3000/api';
  static const String authBaseUrl = 'http://localhost:3000';

  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userProfileKey = 'user_profile';

  // App Configuration
  static const String appName = 'Torrent Streamer';
  static const String appVersion = '1.0.0';

  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // Torrent Configuration
  static const int maxConcurrentDownloads = 3;
  static const int streamingBufferPieces = 10;
  static const int connectionTimeout = 30000; // 30 seconds
  static const int downloadTimeout = 60000; // 60 seconds

  // UI Configuration
  static const double defaultPadding = 16.0;
  static const double cardRadius = 12.0;
  static const double buttonRadius = 8.0;

  // Animation Duration
  static const Duration defaultAnimationDuration = Duration(milliseconds: 300);
  static const Duration longAnimationDuration = Duration(milliseconds: 500);

  // P2P Configuration
  static const int maxPeers = 50;
  static const int minPeers = 5;
  static const int trackerPort = 8000;
}