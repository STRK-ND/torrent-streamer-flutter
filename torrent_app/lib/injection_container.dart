import 'package:get_it/get_it.dart';
import 'package:injectable/injectable.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';

import 'injection_container.config.dart';

final GetIt sl = GetIt.instance;

@injectableInit
Future<void> initializeDependencies() async {
  // External dependencies
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerLazySingleton(() => sharedPreferences);

  final dio = Dio();
  dio.options.baseUrl = 'http://localhost:3000/api'; // Backend API URL
  dio.interceptors.add(LogInterceptor(
    requestBody: true,
    responseBody: true,
  ));
  sl.registerLazySingleton(() => dio);

  // Initialize generated dependencies
  await $initGetIt(sl);
}