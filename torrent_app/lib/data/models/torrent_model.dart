import 'package:json_annotation/json_annotation.dart';
import 'package:torrent_app/domain/entities/torrent.dart';

part 'torrent_model.g.dart';

@JsonSerializable()
class TorrentModel extends Torrent {
  const TorrentModel({
    required super.id,
    required super.title,
    super.description,
    required super.magnetLink,
    super.infoHash,
    super.size,
    super.seeders,
    super.leechers,
    super.category,
    super.subcategory,
    required super.createdAt,
    required super.updatedAt,
    super.files,
    super.posterUrl,
  });

  factory TorrentModel.fromJson(Map<String, dynamic> json) => _$TorrentModelFromJson(json);

  Map<String, dynamic> toJson() => _$TorrentModelToJson(this);

  factory TorrentModel.fromEntity(Torrent torrent) {
    return TorrentModel(
      id: torrent.id,
      title: torrent.title,
      description: torrent.description,
      magnetLink: torrent.magnetLink,
      infoHash: torrent.infoHash,
      size: torrent.size,
      seeders: torrent.seeders,
      leechers: torrent.leechers,
      category: torrent.category,
      subcategory: torrent.subcategory,
      createdAt: torrent.createdAt,
      updatedAt: torrent.updatedAt,
      files: torrent.files,
      posterUrl: torrent.posterUrl,
    );
  }
}

@JsonSerializable()
class TorrentFileModel extends TorrentFile {
  const TorrentFileModel({
    required super.id,
    required super.name,
    required super.size,
    super.path,
    super.index,
  });

  factory TorrentFileModel.fromJson(Map<String, dynamic> json) => _$TorrentFileModelFromJson(json);

  Map<String, dynamic> toJson() => _$TorrentFileModelToJson(this);

  factory TorrentFileModel.fromEntity(TorrentFile file) {
    return TorrentFileModel(
      id: file.id,
      name: file.name,
      size: file.size,
      path: file.path,
      index: file.index,
    );
  }
}