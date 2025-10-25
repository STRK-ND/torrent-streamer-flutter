import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:torrent_app/injection_container.dart';
import 'package:torrent_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:torrent_app/presentation/bloc/torrent/torrent_bloc.dart';
import 'package:torrent_app/presentation/pages/splash/splash_page.dart';
import 'package:torrent_app/core/theme/app_theme.dart';

class TorrentApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (context) => sl<AuthBloc>(),
        ),
        BlocProvider<TorrentBloc>(
          create: (context) => sl<TorrentBloc>(),
        ),
      ],
      child: MaterialApp(
        title: 'Torrent Streamer',
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.dark,
        home: SplashPage(),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}