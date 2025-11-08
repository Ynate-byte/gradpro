<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GoiyDetai;
use App\Models\PhanhoiGoiy;
use App\Models\Giangvien;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class PhanhoiGoiyController extends Controller
{
    /**
     * Lưu một phản hồi mới cho một góp ý.
     */
    public function store(Request $request, GoiyDetai $goiy)
    {
        $validator = Validator::make($request->all(), [
            'NOIDUNG' => 'required|string|min:1|max:1000',
        ], [
            'NOIDUNG.required' => 'Nội dung phản hồi là bắt buộc',
            'NOIDUNG.min' => 'Nội dung phản hồi phải có ít nhất 1 ký tự',
            'NOIDUNG.max' => 'Nội dung phản hồi không được vượt quá 1000 ký tự',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Get current authenticated user
        $currentUser = Auth::user();

        // Check if user is a lecturer
        $lecturer = Giangvien::where('ID_NGUOIDUNG', $currentUser->ID_NGUOIDUNG)->first();
        if (!$lecturer) {
            return response()->json(['message' => 'Chỉ giảng viên mới có thể phản hồi góp ý'], 403);
        }

        // Kiểm tra xem đề tài có còn ở trạng thái cho phép thảo luận không
        if (!in_array($goiy->detai->TRANGTHAI, ['Nháp', 'Chờ duyệt', 'Yêu cầu chỉnh sửa'])) {
            return response()->json(['message' => 'Không thể phản hồi góp ý cho đề tài đã duyệt'], 403);
        }
        
        // Bất kỳ giảng viên nào cũng có thể tham gia thảo luận (bao gồm người tạo đề tài và người góp ý)
        // (Bạn có thể thêm logic siết chặt quyền ở đây nếu muốn)

        $phanhoi = $goiy->phanhois()->create([
            'ID_GIANGVIEN' => $lecturer->ID_GIANGVIEN,
            'NOIDUNG' => $request->NOIDUNG,
        ]);

        // Load lại thông tin giảng viên để hiển thị
        $phanhoi->load('giangvien.nguoidung');

        return response()->json([
            'message' => 'Phản hồi đã được gửi thành công',
            'phanhoi' => $phanhoi
        ], 201);
    }
}