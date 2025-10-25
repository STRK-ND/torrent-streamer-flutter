import 'package:dartz/dartz.dart';
import 'package:torrent_app/core/errors/failures.dart';
import 'package:torrent_app/domain/entities/user.dart';
import 'package:torrent_app/domain/repositories/auth_repository.dart';

class SignUpUseCase {
  final AuthRepository repository;

  SignUpUseCase(this.repository);

  Future<Either<Failure, User>> call(String email, String password) {
    return repository.signUp(email, password);
  }
}