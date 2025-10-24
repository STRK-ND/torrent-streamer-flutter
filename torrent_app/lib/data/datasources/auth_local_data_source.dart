import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:torrent_app/core/constants/app_constants.dart';
import 'package:torrent_app/data/models/user_model.dart';

abstract class AuthLocalDataSource {
  Future<void> saveToken(String token);
  Future<String?> getToken();
  Future<void> saveRefreshToken(String refreshToken);
  Future<String?> getRefreshToken();
  Future<void> saveUser(UserModel user);
  Future<UserModel?> getUser();
  Future<void> clearAllData();
}

class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  final SharedPreferences sharedPreferences;

  AuthLocalDataSourceImpl(this.sharedPreferences);

  @override
  Future<void> saveToken(String token) async {
    await sharedPreferences.setString(AppConstants.accessTokenKey, token);
  }

  @override
  Future<String?> getToken() async {
    return sharedPreferences.getString(AppConstants.accessTokenKey);
  }

  @override
  Future<void> saveRefreshToken(String refreshToken) async {
    await sharedPreferences.setString(AppConstants.refreshTokenKey, refreshToken);
  }

  @override
  Future<String?> getRefreshToken() async {
    return sharedPreferences.getString(AppConstants.refreshTokenKey);
  }

  @override
  Future<void> saveUser(UserModel user) async {
    final userJson = jsonEncode(user.toJson());
    await sharedPreferences.setString(AppConstants.userProfileKey, userJson);
  }

  @override
  Future<UserModel?> getUser() async {
    final userJson = sharedPreferences.getString(AppConstants.userProfileKey);
    if (userJson == null) return null;

    try {
      final userMap = jsonDecode(userJson) as Map<String, dynamic>;
      return UserModel.fromJson(userMap);
    } catch (e) {
      // If there's an error parsing the user data, clear it
      await clearUser();
      return null;
    }
  }

  @override
  Future<void> clearAllData() async {
    await sharedPreferences.remove(AppConstants.accessTokenKey);
    await sharedPreferences.remove(AppConstants.refreshTokenKey);
    await sharedPreferences.remove(AppConstants.userProfileKey);
  }

  Future<void> clearUser() async {
    await sharedPreferences.remove(AppConstants.userProfileKey);
  }
}