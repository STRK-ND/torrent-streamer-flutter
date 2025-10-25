# Torrent Streamer Flutter App

A P2P torrent streaming application built with Flutter, featuring clean architecture and modern development practices.

## Features

- **P2P Streaming**: Stream torrents directly using peer-to-peer technology
- **Modern UI**: Material Design 3 with dark mode support
- **Search & Browse**: Search torrents and browse latest content
- **Authentication**: Secure user authentication with JWT tokens
- **Video Player**: Integrated video player for streaming content
- **Clean Architecture**: Well-organized code with separation of concerns

## Architecture

This app follows **Clean Architecture** principles:

```
lib/
├── core/                 # Core utilities, constants, themes
├── data/                 # Data layer (models, repositories, datasources)
├── domain/               # Domain layer (entities, use cases, repositories)
├── presentation/         # UI layer (pages, widgets, BLoC)
├── main.dart            # App entry point
└── app.dart             # Main app widget
```

### Key Components

- **BLoC Pattern**: State management using Flutter BLoC
- **Dependency Injection**: Using GetIt for service location
- **Repository Pattern**: Clean data access abstraction
- **Use Cases**: Business logic separation
- **Responsive Design**: Material Design 3 components

## Tech Stack

- **Framework**: Flutter 3.x
- **State Management**: BLoC 8.x
- **HTTP Client**: Dio 5.x
- **Local Storage**: SharedPreferences, Hive
- **Video Player**: video_player, chewie
- **Navigation**: GoRouter
- **Dependency Injection**: GetIt, Injectable
- **Code Generation**: build_runner, json_annotation

## Getting Started

### Prerequisites

- Flutter SDK (>=3.1.0)
- Dart SDK
- Android Studio / VS Code with Flutter extensions
- Android device or emulator

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd torrent_app
   ```

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Generate code (if needed):
   ```bash
   flutter packages pub run build_runner build
   ```

4. Run the app:
   ```bash
   flutter run
   ```

### Configuration

Update the API base URL in `lib/core/constants/app_constants.dart`:

```dart
class AppConstants {
  static const String baseUrl = 'http://your-backend-url:3000/api';
  static const String authBaseUrl = 'http://your-backend-url:3000';
  // ...
}
```

## Project Structure

```
lib/
├── core/
│   ├── constants/        # App constants
│   ├── errors/          # Custom error types
│   ├── theme/           # App themes
│   └── utils/           # Utility functions
├── data/
│   ├── datasources/     # Local and remote data sources
│   ├── models/          # Data models with JSON serialization
│   └── repositories/    # Repository implementations
├── domain/
│   ├── entities/        # Domain entities
│   ├── repositories/    # Repository interfaces
│   └── usecases/        # Business logic use cases
└── presentation/
    ├── bloc/           # BLoC state management
    ├── pages/          # Screen pages
    └── widgets/        # Reusable widgets
```

## Key Features Implementation

### Authentication System
- JWT-based authentication
- Secure token storage using SharedPreferences
- Automatic token refresh
- Login/Registration flow

### Torrent Management
- Search torrents by query
- Browse latest torrents
- Torrent details view
- Category filtering

### P2P Streaming
- Hybrid P2P engine (LibTorrent + WebTorrent)
- Intelligent engine switching
- Streaming buffer management
- Background downloading

### Video Player
- Custom video controls
- Streaming progress indicator
- P2P statistics display
- Full-screen support

## Development Commands

```bash
# Install dependencies
flutter pub get

# Run the app in debug mode
flutter run

# Build for release (Android)
flutter build apk --release

# Build for release (Android App Bundle)
flutter build appbundle --release

# Run tests
flutter test

# Generate code (models, repositories)
flutter packages pub run build_runner build --delete-conflicting-outputs

# Analyze code
flutter analyze
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure code passes analysis
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security Considerations

This app is designed for legal torrent streaming only. Users are responsible for ensuring they have the right to stream and download content.

## Future Enhancements

- [ ] Chromecast support
- [ ] Subtitle integration
- [ ] Multiple language support
- [ ] Advanced filtering options
- [ ] Watch history
- [ ] Favorites/bookmarks
- [ ] Advanced P2P features (DHT, PEX)