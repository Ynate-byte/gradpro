<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;
use App\Models\Nguoidung;
use App\Services\ActivityLogger;

class AuthController extends Controller
{
    /**
     * Xử lý đăng nhập của người dùng.
     * Có tích hợp Rate Limiting để chống Brute Force.
     */
    public function login(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string',
            'password' => 'required',
        ]);

        $throttleKey = Str::lower($request->identifier) . '|' . $request->ip();

        // 3. Kiểm tra xem có đang bị khóa không (Giới hạn: 5 lần thử sai)
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            
            Log::warning("Brute force detected for user: {$request->identifier} from IP: {$request->ip()}");

            return response()->json([
                'message' => "Tài khoản tạm khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau {$seconds} giây.",
                'lockout' => true,
                'retry_after' => $seconds
            ], 429);
        }

        $identifier = $request->identifier;

        $isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL);
        $fieldToSearch = $isEmail ? 'EMAIL' : 'MA_DINHDANH';

        $user = Nguoidung::with('vaitro')->where($fieldToSearch, $identifier)->first();

        if (!$user || !$user->TRANGTHAI_KICHHOAT || !Hash::check($request->password, $user->MATKHAU_BAM)) {
            
            RateLimiter::hit($throttleKey, 60); 
            
            $retriesLeft = RateLimiter::retriesLeft($throttleKey, 5);

            Log::warning('Đăng nhập thất bại', [
                'identifier' => $identifier,
                'ip' => $request->ip(),
                'reason' => !$user ? 'User not found' : (!$user->TRANGTHAI_KICHHOAT ? 'Inactive' : 'Wrong password'),
                'retries_left' => $retriesLeft
            ]);
            
            $message = "Thông tin đăng nhập không chính xác.";
            if ($user && !$user->TRANGTHAI_KICHHOAT) {
                $message = "Tài khoản này đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.";
            }

            throw ValidationException::withMessages([
                'identifier' => ["{$message} Bạn còn {$retriesLeft} lần thử."],
            ]);
        }

        // 6. Kiểm tra ràng buộc nghiệp vụ: Sinh viên không được dùng Email
        if ($user->vaitro && $user->vaitro->TEN_VAITRO === 'Sinh viên' && $isEmail) {
            throw ValidationException::withMessages([
                'identifier' => ['Sinh viên vui lòng đăng nhập bằng Mã số sinh viên (MSSV), không sử dụng Email.'],
            ]);
        }

        // 7. Đăng nhập thành công -> Xóa biến đếm lỗi của RateLimiter
        RateLimiter::clear($throttleKey);

        // Tạo Token
        $token = $user->createToken('auth_token')->plainTextToken;

        // Cập nhật thời gian đăng nhập cuối
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
        if ($request->user()) {
            ActivityLogger::log('LOGOUT', 'Đăng xuất hệ thống');
            $request->user()->currentAccessToken()->delete();
        }
        
        return response()->json(['message' => 'Đăng xuất thành công']);
    }

    /**
     * Lấy thông tin người dùng hiện tại.
     */
    public function me(Request $request) {
        $user = $request->user();
        
        if ($user) {
            $user->load(['sinhvien', 'giangvien', 'vaitro']); 
        }
        
        return response()->json($user);
    }
}