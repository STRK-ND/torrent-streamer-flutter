import 'package:dartz/dartz.dart';
import 'package:torrent_app/core/errors/failures.dart';
import 'package:torrent_app/domain/entities/torrent.dart';
import 'package:torrent_app/domain/repositories/torrent_repository.dart';

class SearchTorrentsUseCase {
  final TorrentRepository repository;

  SearchTorrentsUseCase(this.repository);

  Future<Either<Failure, List<Torrent>>> call(String query, {int page = 1, int limit = 20}) {
    return repository.searchTorrents(query, page: page, limit: limit);
  }
}