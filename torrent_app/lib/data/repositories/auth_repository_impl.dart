import 'package:dartz/dartz.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:torrent_app/core/constants/app_constants.dart';
import 'package:torrent_app/core/errors/failures.dart';
import 'package:torrent_app/data/datasources/auth_local_data_source.dart';
import 'package:torrent_app/data/datasources/auth_remote_data_source.dart';
import 'package:torrent_app/data/models/user_model.dart';
import 'package:torrent_app/domain/entities/user.dart';
import 'package:torrent_app/domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final AuthLocalDataSource localDataSource;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  @override
  Future<Either<Failure, User>> signIn(String email, String password) async {
    try {
      final userModel = await remoteDataSource.signIn(email, password);

      // Save user and token locally
      await localDataSource.saveUser(userModel);
      await localDataSource.saveToken('user_token'); // In real app, this would come from response

      return Right(userModel);
    } catch (e) {
      return Left(_mapExceptionToFailure(e));
    }
  }

  @override
  Future<Either<Failure, User>> signUp(String email, String password) async {
    try {
      final userModel = await remoteDataSource.signUp(email, password);

      // Save user and token locally
      await localDataSource.saveUser(userModel);
      await localDataSource.saveToken('user_token'); // In real app, this would come from response

      return Right(userModel);
    } catch (e) {
      return Left(_mapExceptionToFailure(e));
    }
  }

  @override
  Future<Either<Failure, User>> getCurrentUser() async {
    try {
      final token = await localDataSource.getToken();
      if (token == null) {
        return const Left(AuthenticationFailure('No token found'));
      }

      final userModel = await localDataSource.getUser();
      if (userModel != null) {
        return Right(userModel);
      }

      // If not in cache, fetch from remote
      final remoteUser = await remoteDataSource.getCurrentUser(token);
      await localDataSource.saveUser(remoteUser);

      return Right(remoteUser);
    } catch (e) {
      return Left(_mapExceptionToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> signOut() async {
    try {
      await localDataSource.clearAllData();
      return const Right(null);
    } catch (e) {
      return Left(_mapExceptionToFailure(e));
    }
  }

  @override
  Future<Either<Failure, String>> refreshToken() async {
    try {
      final refreshToken = await localDataSource.getRefreshToken();
      if (refreshToken == null) {
        return const Left(AuthenticationFailure('No refresh token found'));
      }

      final newToken = await remoteDataSource.refreshToken(refreshToken);
      await localDataSource.saveToken(newToken);

      return Right(newToken);
    } catch (e) {
      return Left(_mapExceptionToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> saveToken(String token) async {
    try {
      await localDataSource.saveToken(token);
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure('Failed to save token: $e'));
    }
  }

  @override
  Future<Either<Failure, String?>> getToken() async {
    try {
      final token = await localDataSource.getToken();
      return Right(token);
    } catch (e) {
      return Left(CacheFailure('Failed to get token: $e'));
    }
  }

  Failure _mapExceptionToFailure(dynamic exception) {
    if (exception is Failure) {
      return exception;
    }
    return UnknownFailure('An unexpected error occurred: $exception');
  }
}