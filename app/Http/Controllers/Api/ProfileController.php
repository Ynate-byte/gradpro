<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Services\ActivityLogger;

class ProfileController extends Controller
{
    /**
     * Cập nhật thông tin chung (Email, SĐT, Chuyên ngành)
     */
    public function updateProfile(Request $request)
    {
        /** @var \App\Models\Nguoidung $user */
        $user = Auth::user();

        // [FIX 1] Load quan hệ sinh viên/giảng viên để tránh lỗi null khi truy cập
        $user->load(['sinhvien', 'giangvien']);

        // 1. Validate dữ liệu
        $validated = $request->validate([
            'EMAIL' => [
                'required', 
                'email', 
                'max:100',
                // Bỏ qua check trùng nếu là email của chính user này
                Rule::unique('NGUOIDUNG', 'EMAIL')->ignore($user->ID_NGUOIDUNG, 'ID_NGUOIDUNG')
            ],
            // [FIX 2] Đổi regex sang dạng đơn giản (10-11 số) để tránh lỗi nhà mạng mới
            'SO_DIENTHOAI' => ['required', 'regex:/^[0-9]{10,11}$/'],
            
            // ID_CHUYENNGANH chỉ validate nếu có gửi lên
            'ID_CHUYENNGANH' => ['nullable', 'exists:CHUYENNGANH,ID_CHUYENNGANH'],
        ], [
            'EMAIL.unique' => 'Email này đã được sử dụng bởi người khác.',
            'SO_DIENTHOAI.regex' => 'Số điện thoại phải bao gồm 10-11 chữ số.',
            'ID_CHUYENNGANH.exists' => 'Chuyên ngành không hợp lệ.'
        ]);

        DB::beginTransaction();
        try {
            // 2. Cập nhật bảng NGUOIDUNG
            $user->update([
                'EMAIL' => $validated['EMAIL'],
                'SO_DIENTHOAI' => $validated['SO_DIENTHOAI'],
            ]);

            // 3. Nếu là Sinh viên (có bản ghi sinhvien), cập nhật Chuyên ngành
            // [FIX 3] Kiểm tra trực tiếp quan hệ thay vì check string Role
            if ($user->sinhvien) {
                if ($request->filled('ID_CHUYENNGANH')) {
                    // Sử dụng relationship update để an toàn
                    $user->sinhvien()->update([
                        'ID_CHUYENNGANH' => $request->ID_CHUYENNGANH
                    ]);
                }
            }

            DB::commit();

            ActivityLogger::log('UPDATE_PROFILE', 'Cập nhật thông tin cá nhân');

            // 4. Load lại đầy đủ thông tin để trả về frontend cập nhật state
            $user->refresh()->load(['sinhvien.chuyennganh', 'giangvien.khoabomon', 'vaitro']);

            return response()->json([
                'message' => 'Cập nhật thông tin thành công.',
                'user' => $user
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            // Log lỗi ra file để debug nếu cần: storage/logs/laravel.log
            \Illuminate\Support\Facades\Log::error("Update Profile Error: " . $e->getMessage());
            
            return response()->json([
                'message' => 'Lỗi máy chủ khi cập nhật: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Đổi mật khẩu
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:6|confirmed',
        ], [
            'new_password.confirmed' => 'Mật khẩu xác nhận không khớp.',
            'new_password.min' => 'Mật khẩu mới phải có ít nhất 6 ký tự.',
        ]);

        $user = Auth::user();

        // 1. Kiểm tra mật khẩu cũ
        // [FIX] Sử dụng đúng tên cột MATKHAU_BAM
        if (!Hash::check($request->current_password, $user->MATKHAU_BAM)) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => [
                    'current_password' => ['Mật khẩu hiện tại không đúng.']
                ]
            ], 422);
        }

        // 2. Cập nhật mật khẩu mới
        $user->update([
            'MATKHAU_BAM' => Hash::make($request->new_password)
        ]);

        ActivityLogger::log('CHANGE_PASSWORD', 'Đổi mật khẩu đăng nhập');

        return response()->json(['message' => 'Đổi mật khẩu thành công.']);
    }
}