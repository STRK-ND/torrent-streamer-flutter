import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:torrent_app/core/errors/failures.dart';
import 'package:torrent_app/domain/entities/torrent.dart';
import 'package:torrent_app/domain/usecases/torrent/search_torrents_usecase.dart';
import 'package:torrent_app/domain/usecases/torrent/get_latest_torrents_usecase.dart';
import 'package:torrent_app/domain/usecases/torrent/get_torrent_details_usecase.dart';

part 'torrent_event.dart';
part 'torrent_state.dart';

class TorrentBloc extends Bloc<TorrentEvent, TorrentState> {
  final SearchTorrentsUseCase searchTorrentsUseCase;
  final GetLatestTorrentsUseCase getLatestTorrentsUseCase;
  final GetTorrentDetailsUseCase getTorrentDetailsUseCase;

  TorrentBloc({
    required this.searchTorrentsUseCase,
    required this.getLatestTorrentsUseCase,
    required this.getTorrentDetailsUseCase,
  }) : super(TorrentInitial()) {
    on<TorrentEvent>((event, emit) async {
      if (event is SearchTorrentsEvent) {
        await _mapSearchTorrentsToState(event, emit);
      } else if (event is GetLatestTorrentsEvent) {
        await _mapGetLatestTorrentsToState(event, emit);
      } else if (event is GetTorrentDetailsEvent) {
        await _mapGetTorrentDetailsToState(event, emit);
      } else if (event is ClearTorrentErrorEvent) {
        emit(TorrentLoaded(state.torrents, isLoading: false));
      }
    });
  }

  Future<void> _mapSearchTorrentsToState(SearchTorrentsEvent event, Emitter<TorrentState> emit) async {
    emit(TorrentLoading(state.torrents));

    final result = await searchTorrentsUseCase(
      event.query,
      page: event.page,
      limit: event.limit,
    );

    result.fold(
      (failure) => emit(TorrentError(failure.message)),
      (torrents) {
        if (event.page == 1) {
          emit(TorrentLoaded(torrents));
        } else {
          final updatedTorrents = List<Torrent>.from(state.torrents)..addAll(torrents);
          emit(TorrentLoaded(updatedTorrents));
        }
      },
    );
  }

  Future<void> _mapGetLatestTorrentsToState(GetLatestTorrentsEvent event, Emitter<TorrentState> emit) async {
    emit(TorrentLoading(state.torrents));

    final result = await getLatestTorrentsUseCase(page: event.page, limit: event.limit);

    result.fold(
      (failure) => emit(TorrentError(failure.message)),
      (torrents) {
        if (event.page == 1) {
          emit(TorrentLoaded(torrents));
        } else {
          final updatedTorrents = List<Torrent>.from(state.torrents)..addAll(torrents);
          emit(TorrentLoaded(updatedTorrents));
        }
      },
    );
  }

  Future<void> _mapGetTorrentDetailsToState(GetTorrentDetailsEvent event, Emitter<TorrentState> emit) async {
    emit(TorrentLoading(state.torrents));

    final result = await getTorrentDetailsUseCase(event.torrentId);

    result.fold(
      (failure) => emit(TorrentError(failure.message)),
      (torrent) {
        // Update the torrent in the list if it exists, or add it if it doesn't
        final updatedTorrents = List<Torrent>.from(state.torrents);
        final existingIndex = updatedTorrents.indexWhere((t) => t.id == torrent.id);

        if (existingIndex != -1) {
          updatedTorrents[existingIndex] = torrent;
        } else {
          updatedTorrents.add(torrent);
        }

        emit(TorrentLoaded(updatedTorrents, selectedTorrent: torrent));
      },
    );
  }
}