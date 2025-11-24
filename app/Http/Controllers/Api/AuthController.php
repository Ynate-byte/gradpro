<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;
use App\Models\Nguoidung;
use App\Services\ActivityLogger;

class AuthController extends Controller
{
    /**
     * Xử lý đăng nhập của người dùng.
     */
    public function login(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string',
            'password' => 'required',
        ]);

        $identifier = $request->identifier;

        // 1. Xác định xem người dùng đang nhập Email hay Mã định danh
        $isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL);
        $fieldToSearch = $isEmail ? 'EMAIL' : 'MA_DINHDANH';

        $user = Nguoidung::with('vaitro')->where($fieldToSearch, $identifier)->first();

        // 3. Kiểm tra cơ bản: Tồn tại user, Đã kích hoạt, Mật khẩu đúng
        if (!$user || !$user->TRANGTHAI_KICHHOAT || !Hash::check($request->password, $user->MATKHAU_BAM)) {
            Log::warning('Đăng nhập thất bại', [
                'identifier' => $identifier,
                'ip' => $request->ip(),
                'reason' => !$user ? 'User not found' : (!$user->TRANGTHAI_KICHHOAT ? 'Inactive' : 'Wrong password')
            ]);
            
            throw ValidationException::withMessages([
                'identifier' => ['Thông tin đăng nhập không chính xác hoặc tài khoản đã bị khóa.'],
            ]);
        }

        if ($user->vaitro && $user->vaitro->TEN_VAITRO === 'Sinh viên' && $isEmail) {
            throw ValidationException::withMessages([
                'identifier' => ['Sinh viên vui lòng đăng nhập bằng Mã số sinh viên (MSSV), không sử dụng Email.'],
            ]);
        }

        // 5. Đăng nhập thành công -> Tạo token
        $token = $user->createToken('auth_token')->plainTextToken;

        $user->DANGNHAP_CUOI = now();
        $user->save();

        ActivityLogger::logLogin($user->ID_NGUOIDUNG);
        
        return response()->json([
            'message' => 'Đăng nhập thành công',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load(['vaitro', 'giangvien.chucvus', 'sinhvien.chuyennganh'])
        ]);
    }

    /**
     * Xử lý đăng xuất của người dùng (xóa token hiện tại).
     */
    public function logout(Request $request)
    {
        ActivityLogger::log('LOGOUT', 'Đăng xuất hệ thống');
        
        $request->user()->currentAccessToken()->delete();
        
        return response()->json(['message' => 'Đăng xuất thành công']);
    }

    public function me(Request $request) {
        $user = $request->user();
        $user->load('sinhvien', 'giangvien'); 
        return response()->json($user);
    }
}