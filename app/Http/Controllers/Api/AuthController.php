<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Models\Nguoidung; // <-- SỬ DỤNG MODEL MỚI

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Thay đổi logic tìm kiếm người dùng
        $user = Nguoidung::where('EMAIL', $request->email)->first();

        // Thay đổi logic kiểm tra mật khẩu
        if (!$user || !$user->TRANGTHAI_KICHHOAT || !Hash::check($request->password, $user->MATKHAU_BAM)) {
            throw ValidationException::withMessages([
                'email' => ['Thông tin đăng nhập không chính xác hoặc tài khoản đã bị khóa.'],
            ]);
        }

        // Tạo token và trả về
        $token = $user->createToken('auth_token')->plainTextToken;

        // Cập nhật thời gian đăng nhập cuối
        $user->DANGNHAP_CUOI = now();
        $user->save();

        return response()->json([
            'message' => 'Đăng nhập thành công',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('vaitro') // Gửi kèm thông tin vai trò
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Đăng xuất thành công']);
    }
}