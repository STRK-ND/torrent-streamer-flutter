import 'package:dartz/dartz.dart';
import 'package:torrent_app/core/errors/failures.dart';
import 'package:torrent_app/domain/entities/torrent.dart';
import 'package:torrent_app/domain/repositories/torrent_repository.dart';

class GetTorrentDetailsUseCase {
  final TorrentRepository repository;

  GetTorrentDetailsUseCase(this.repository);

  Future<Either<Failure, Torrent>> call(String torrentId) {
    return repository.getTorrentDetails(torrentId);
  }
}