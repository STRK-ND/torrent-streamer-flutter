import 'package:dartz/dartz.dart';
import 'package:torrent_app/core/errors/failures.dart';
import 'package:torrent_app/domain/entities/torrent.dart';

abstract class TorrentRepository {
  Future<Either<Failure, List<Torrent>>> searchTorrents(String query, {int page = 1, int limit = 20});
  Future<Either<Failure, List<Torrent>>> getLatestTorrents({int page = 1, int limit = 20});
  Future<Either<Failure, Torrent>> getTorrentDetails(String id);
  Future<Either<Failure, List<Torrent>>> getTorrentsByCategory(String category, {int page = 1, int limit = 20});
}