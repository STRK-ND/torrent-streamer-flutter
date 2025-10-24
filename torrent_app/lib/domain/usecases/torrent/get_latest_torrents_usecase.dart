import 'package:dartz/dartz.dart';
import 'package:torrent_app/core/errors/failures.dart';
import 'package:torrent_app/domain/entities/torrent.dart';
import 'package:torrent_app/domain/repositories/torrent_repository.dart';

class GetLatestTorrentsUseCase {
  final TorrentRepository repository;

  GetLatestTorrentsUseCase(this.repository);

  Future<Either<Failure, List<Torrent>>> call({int page = 1, int limit = 20}) {
    return repository.getLatestTorrents(page: page, limit: limit);
  }
}