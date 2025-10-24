part of 'torrent_bloc.dart';

abstract class TorrentState extends Equatable {
  const TorrentState();

  @override
  List<Object> get props => [];
}

class TorrentInitial extends TorrentState {
  const TorrentInitial();

  @override
  List<Object> get props => [];
}

class TorrentLoading extends TorrentState {
  final List<Torrent> torrents;

  const TorrentLoading([this.torrents = const []]);

  @override
  List<Object> get props => [torrents];
}

class TorrentLoaded extends TorrentState {
  final List<Torrent> torrents;
  final Torrent? selectedTorrent;
  final bool isLoading;

  const TorrentLoaded(this.torrents, {this.selectedTorrent, this.isLoading = false});

  @override
  List<Object> get props => [torrents, selectedTorrent, isLoading];
}

class TorrentError extends TorrentState {
  final String message;
  final List<Torrent> torrents;

  const TorrentError(this.message, [this.torrents = const []]);

  @override
  List<Object> get props => [message, torrents];
}