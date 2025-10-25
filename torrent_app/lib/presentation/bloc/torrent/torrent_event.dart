part of 'torrent_bloc.dart';

abstract class TorrentEvent extends Equatable {
  const TorrentEvent();

  @override
  List<Object> get props => [];
}

class SearchTorrentsEvent extends TorrentEvent {
  final String query;
  final int page;
  final int limit;

  const SearchTorrentsEvent(this.query, {this.page = 1, this.limit = 20});

  @override
  List<Object> get props => [query, page, limit];
}

class GetLatestTorrentsEvent extends TorrentEvent {
  final int page;
  final int limit;

  const GetLatestTorrentsEvent({this.page = 1, this.limit = 20});

  @override
  List<Object> get props => [page, limit];
}

class GetTorrentDetailsEvent extends TorrentEvent {
  final String torrentId;

  const GetTorrentDetailsEvent(this.torrentId);

  @override
  List<Object> get props => [torrentId];
}

class ClearTorrentErrorEvent extends TorrentEvent {
  const ClearTorrentErrorEvent();
}