import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:torrent_app/core/constants/app_constants.dart';
import 'package:torrent_app/core/errors/failures.dart';
import 'package:torrent_app/data/models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<UserModel> signUp(String email, String password);
  Future<UserModel> signIn(String email, String password);
  Future<UserModel> getCurrentUser(String token);
  Future<String> refreshToken(String refreshToken);
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio dio;

  AuthRemoteDataSourceImpl(this.dio);

  @override
  Future<UserModel> signIn(String email, String password) async {
    try {
      final response = await dio.post(
        '${AppConstants.authBaseUrl}/api/auth/sign-in',
        data: {
          'email': email,
          'password': password,
        },
      );

      if (response.statusCode == 200) {
        final userData = response.data['user'];
        final token = response.data['token'];

        // Store token for future requests
        dio.options.headers['Authorization'] = 'Bearer $token';

        return UserModel.fromJson(userData);
      } else {
        throw ServerFailure('Authentication failed');
      }
    } on DioException catch (e) {
      throw _handleDioError(e);
    } catch (e) {
      throw UnknownFailure('An unexpected error occurred: $e');
    }
  }

  @override
  Future<UserModel> signUp(String email, String password) async {
    try {
      final response = await dio.post(
        '${AppConstants.authBaseUrl}/api/auth/sign-up',
        data: {
          'email': email,
          'password': password,
        },
      );

      if (response.statusCode == 201) {
        final userData = response.data['user'];
        final token = response.data['token'];

        // Store token for future requests
        dio.options.headers['Authorization'] = 'Bearer $token';

        return UserModel.fromJson(userData);
      } else {
        throw ServerFailure('Registration failed');
      }
    } on DioException catch (e) {
      throw _handleDioError(e);
    } catch (e) {
      throw UnknownFailure('An unexpected error occurred: $e');
    }
  }

  @override
  Future<UserModel> getCurrentUser(String token) async {
    try {
      final response = await dio.get(
        '${AppConstants.baseUrl}/users/me',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.data);
      } else {
        throw ServerFailure('Failed to get current user');
      }
    } on DioException catch (e) {
      throw _handleDioError(e);
    } catch (e) {
      throw UnknownFailure('An unexpected error occurred: $e');
    }
  }

  @override
  Future<String> refreshToken(String refreshToken) async {
    try {
      final response = await dio.post(
        '${AppConstants.authBaseUrl}/api/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200) {
        return response.data['token'];
      } else {
        throw ServerFailure('Token refresh failed');
      }
    } on DioException catch (e) {
      throw _handleDioError(e);
    } catch (e) {
      throw UnknownFailure('An unexpected error occurred: $e');
    }
  }

  Failure _handleDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return NetworkFailure('Connection timeout');
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        if (statusCode != null) {
          if (statusCode >= 400 && statusCode < 500) {
            if (statusCode == 401) {
              return AuthenticationFailure('Unauthorized');
            } else if (statusCode == 403) {
              return PermissionFailure('Forbidden');
            } else if (statusCode == 422) {
              return ValidationFailure('Invalid input: ${e.response?.data['message'] ?? 'Unknown validation error'}');
            }
            return ServerFailure('Client error: $statusCode');
          } else if (statusCode >= 500) {
            return ServerFailure('Server error: $statusCode');
          }
        }
        return ServerFailure('HTTP Error: ${e.response?.statusCode}');
      case DioExceptionType.cancel:
        return NetworkFailure('Request cancelled');
      case DioExceptionType.connectionError:
        return NetworkFailure('No internet connection');
      case DioExceptionType.unknown:
      default:
        return UnknownFailure('Unknown error: ${e.message}');
    }
  }
}