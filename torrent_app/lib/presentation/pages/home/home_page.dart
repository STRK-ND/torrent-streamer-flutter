import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:torrent_app/core/constants/app_constants.dart';
import 'package:torrent_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:torrent_app/presentation/bloc/torrent/torrent_bloc.dart';
import 'package:torrent_app/presentation/widgets/torrent_card.dart';
import 'package:torrent_app/presentation/widgets/custom_text_field.dart';
import 'package:torrent_app/presentation/widgets/custom_button.dart';

class HomePage extends StatefulWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSearching = false;
  int _currentPage = 1;
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    _loadLatestTorrents();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _loadLatestTorrents() {
    context.read<TorrentBloc>().add(const GetLatestTorrentsEvent());
  }

  void _searchTorrents(String query) {
    if (query.trim().isEmpty) return;

    setState(() {
      _isSearching = true;
      _currentPage = 1;
    });

    context.read<TorrentBloc>().add(SearchTorrentsEvent(query.trim()));
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      _loadMoreTorrents();
    }
  }

  void _loadMoreTorrents() {
    if (_isLoadingMore) return;

    final state = context.read<TorrentBloc>().state;
    if (state is TorrentLoaded && !state.isLoading) {
      setState(() {
        _isLoadingMore = true;
        _currentPage++;
      });

      if (_isSearching && _searchController.text.isNotEmpty) {
        context.read<TorrentBloc>().add(
              SearchTorrentsEvent(
                _searchController.text.trim(),
                page: _currentPage,
              ),
            );
      } else {
        context.read<TorrentBloc>().add(
              GetLatestTorrentsEvent(page: _currentPage),
            );
      }

      setState(() {
        _isLoadingMore = false;
      });
    }
  }

  void _onSearchSubmitted(String value) {
    if (value.trim().isEmpty) {
      setState(() {
        _isSearching = false;
      });
      _loadLatestTorrents();
    } else {
      _searchTorrents(value);
    }
  }

  void _clearSearch() {
    _searchController.clear();
    setState(() {
      _isSearching = false;
    });
    _loadLatestTorrents();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.background,
      appBar: AppBar(
        title: const Text('Torrent Streamer'),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.account_circle),
            onPressed: () {
              // TODO: Navigate to profile page
            },
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'sign_out') {
                context.read<AuthBloc>().add(const SignOutEvent());
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'sign_out',
                child: Row(
                  children: [
                    Icon(Icons.logout),
                    SizedBox(width: 8),
                    Text('Sign Out'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppConstants.defaultPadding),
            child: CustomTextField(
              controller: _searchController,
              labelText: 'Search torrents...',
              prefixIcon: Icons.search,
              suffixIcon: _isSearching
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: _clearSearch,
                    )
                  : null,
              onSubmitted: _onSearchSubmitted,
              onChanged: (value) {
                if (value.isEmpty && _isSearching) {
                  _clearSearch();
                }
              },
            ),
          ),
          Expanded(
            child: BlocConsumer<TorrentBloc, TorrentState>(
              listener: (context, state) {
                if (state is AuthError) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(state.message),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
              builder: (context, state) {
                if (state is TorrentLoading && state.torrents.isEmpty) {
                  return const Center(
                    child: CircularProgressIndicator(),
                  );
                }

                if (state is TorrentError && state.torrents.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 64,
                          color: Theme.of(context).colorScheme.error,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Failed to load torrents',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          state.message,
                          style: Theme.of(context).textTheme.bodyMedium,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        CustomButton(
                          text: 'Try Again',
                          onPressed: () {
                            context.read<TorrentBloc>().add(const ClearTorrentErrorEvent());
                            _loadLatestTorrents();
                          },
                        ),
                      ],
                    ),
                  );
                }

                final torrents = state is TorrentLoaded
                    ? state.torrents
                    : state is TorrentError
                        ? state.torrents
                        : <Torrent>[];

                if (torrents.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.movie_outlined,
                          size: 64,
                          color: Theme.of(context).colorScheme.onBackground.withOpacity(0.3),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _isSearching ? 'No torrents found' : 'No torrents available',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: Theme.of(context).colorScheme.onBackground.withOpacity(0.7),
                          ),
                        ),
                        if (_isSearching) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Try a different search term',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onBackground.withOpacity(0.5),
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    _currentPage = 1;
                    if (_isSearching) {
                      _searchTorrents(_searchController.text);
                    } else {
                      _loadLatestTorrents();
                    }
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: AppConstants.defaultPadding),
                    itemCount: torrents.length + (state is TorrentLoaded && state.isLoading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == torrents.length) {
                        return const Padding(
                          padding: EdgeInsets.all(16.0),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }

                      final torrent = torrents[index];
                      return TorrentCard(
                        torrent: torrent,
                        onTap: () {
                          context.go('/torrent/${torrent.id}');
                        },
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}