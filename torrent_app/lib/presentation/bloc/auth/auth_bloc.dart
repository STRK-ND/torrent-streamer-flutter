import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:torrent_app/core/errors/failures.dart';
import 'package:torrent_app/domain/entities/user.dart';
import 'package:torrent_app/domain/usecases/auth/sign_in_usecase.dart';
import 'package:torrent_app/domain/usecases/auth/sign_up_usecase.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final SignInUseCase signInUseCase;
  final SignUpUseCase signUpUseCase;

  AuthBloc({
    required this.signInUseCase,
    required this.signUpUseCase,
  }) : super(AuthInitial()) {
    on<AuthEvent>((event, emit) async {
      if (event is SignInEvent) {
        await _mapSignInToState(event, emit);
      } else if (event is SignUpEvent) {
        await _mapSignUpToState(event, emit);
      } else if (event is CheckAuthStatusEvent) {
        await _mapCheckAuthStatusToState(emit);
      } else if (event is SignOutEvent) {
        await _mapSignOutToState(emit);
      }
    });
  }

  Future<void> _mapSignInToState(SignInEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoading());

    final result = await signInUseCase(event.email, event.password);

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (user) => emit(Authenticated(user)),
    );
  }

  Future<void> _mapSignUpToState(SignUpEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoading());

    final result = await signUpUseCase(event.email, event.password);

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (user) => emit(Authenticated(user)),
    );
  }

  Future<void> _mapCheckAuthStatusToState(Emitter<AuthState> emit) async {
    emit(AuthLoading());

    // Check if user is authenticated (e.g., by checking stored token)
    // For now, we'll emit Unauthenticated state
    emit(Unauthenticated());
  }

  Future<void> _mapSignOutToState(Emitter<AuthState> emit) async {
    emit(AuthLoading());

    // Perform sign out logic
    emit(Unauthenticated());
  }
}