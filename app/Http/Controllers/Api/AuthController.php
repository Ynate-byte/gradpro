<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Models\Nguoidung;

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

        $isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL);
        $fieldToSearch = $isEmail ? 'EMAIL' : 'MA_DINHDANH';

        $user = Nguoidung::where($fieldToSearch, $identifier)->first();

        if (!$user || !$user->TRANGTHAI_KICHHOAT || !Hash::check($request->password, $user->MATKHAU_BAM)) {
            throw ValidationException::withMessages([
                'identifier' => ['Thông tin đăng nhập không chính xác hoặc tài khoản đã bị khóa.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        $user->DANGNHAP_CUOI = now();
        $user->save();

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
        $request->user()->currentAccessToken()->delete();
        
        return response()->json(['message' => 'Đăng xuất thành công']);
    }
}