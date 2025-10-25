import 'package:equatable/equatable.dart';

class Torrent extends Equatable {
  final String id;
  final String title;
  final String? description;
  final String magnetLink;
  final String? infoHash;
  final int? size;
  final int? seeders;
  final int? leechers;
  final String? category;
  final String? subcategory;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<TorrentFile>? files;
  final String? posterUrl;

  const Torrent({
    required this.id,
    required this.title,
    this.description,
    required this.magnetLink,
    this.infoHash,
    this.size,
    this.seeders,
    this.leechers,
    this.category,
    this.subcategory,
    required this.createdAt,
    required this.updatedAt,
    this.files,
    this.posterUrl,
  });

  @override
  List<Object?> get props => [
        id,
        title,
        description,
        magnetLink,
        infoHash,
        size,
        seeders,
        leechers,
        category,
        subcategory,
        createdAt,
        updatedAt,
        files,
        posterUrl,
      ];

  String get sizeFormatted {
    if (size == null) return 'Unknown';
    final bytes = size!;
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  Torrent copyWith({
    String? id,
    String? title,
    String? description,
    String? magnetLink,
    String? infoHash,
    int? size,
    int? seeders,
    int? leechers,
    String? category,
    String? subcategory,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<TorrentFile>? files,
    String? posterUrl,
  }) {
    return Torrent(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      magnetLink: magnetLink ?? this.magnetLink,
      infoHash: infoHash ?? this.infoHash,
      size: size ?? this.size,
      seeders: seeders ?? this.seeders,
      leechers: leechers ?? this.leechers,
      category: category ?? this.category,
      subcategory: subcategory ?? this.subcategory,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      files: files ?? this.files,
      posterUrl: posterUrl ?? this.posterUrl,
    );
  }
}

class TorrentFile extends Equatable {
  final String id;
  final String name;
  final int size;
  final String? path;
  final int? index;

  const TorrentFile({
    required this.id,
    required this.name,
    required this.size,
    this.path,
    this.index,
  });

  @override
  List<Object?> get props => [id, name, size, path, index];

  String get sizeFormatted {
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    if (size < 1024 * 1024 * 1024) return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(size / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  bool get isVideoFile {
    final videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
    return videoExtensions.any((ext) => name.toLowerCase().endsWith(ext));
  }
}