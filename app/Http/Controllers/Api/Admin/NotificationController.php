<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Nguoidung;
use App\Models\Thongbao;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class NotificationController extends Controller
{
    public function broadcast(Request $request)
    {
        if (!$this->isAdmin() && !$this->isGiaoVu() && !$this->isTruongKhoa()) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
        }

        $validated = $request->validate([
            'TIEU_DE' => 'required|string|max:255',
            'NOI_DUNG' => 'required|string',
            'DOI_TUONG' => ['required', Rule::in(['ALL', 'STUDENT', 'LECTURER'])],
            'LIEN_KET' => 'nullable|string|max:500',
            // [THÊM] Validate ID_KEHOACH (nullable)
            'ID_KEHOACH' => 'nullable|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
        ]);

        $target = $validated['DOI_TUONG'];
        $planId = $validated['ID_KEHOACH'] ?? null;
        $senderId = auth()->id();

        try {
            $query = Nguoidung::where('TRANGTHAI_KICHHOAT', true);

            if ($target === 'STUDENT') {
                $query->whereHas('vaitro', function ($q) {
                    $q->where('TEN_VAITRO', 'Sinh viên');
                });

                // [THÊM] Nếu có chọn Kế hoạch, chỉ lấy SV tham gia kế hoạch đó
                if ($planId) {
                    $query->whereHas('sinhvien.cacDotThamGia', function ($q) use ($planId) {
                        $q->where('ID_KEHOACH', $planId);
                    });
                }
            } elseif ($target === 'LECTURER') {
                $query->whereHas('vaitro', function ($q) {
                    $q->where('TEN_VAITRO', 'Giảng viên');
                });
                // Giảng viên thường ít khi lọc theo kế hoạch để gửi thông báo chung, 
                // nhưng nếu muốn bạn cũng có thể thêm logic lọc theo Quota/Hội đồng tại đây.
            }

            $userIds = $query->pluck('ID_NGUOIDUNG');

            if ($userIds->isEmpty()) {
                return response()->json(['message' => 'Không tìm thấy người dùng nào phù hợp.'], 404);
            }

            // Bulk Insert
            $chunks = $userIds->chunk(500);
            $now = now();

            DB::beginTransaction();
            foreach ($chunks as $chunk) {
                $insertData = [];
                foreach ($chunk as $userId) {
                    if ($userId == $senderId) continue;

                    $insertData[] = [
                        'ID_NGUOINHAN' => $userId,
                        'TIEU_DE' => $validated['TIEU_DE'],
                        'NOI_DUNG' => $validated['NOI_DUNG'],
                        'LOAI_THONGBAO' => 'SYSTEM',
                        'LIEN_KET' => $validated['LIEN_KET'] ?? null,
                        'DU_LIEU_GOC' => json_encode([
                            'sender_id' => $senderId, 
                            'type' => 'broadcast',
                            'plan_id' => $planId // Lưu lại để biết thông báo thuộc kế hoạch nào
                        ]),
                        'DA_DOC' => false,
                        'NGAY_TAO' => $now,
                    ];
                }

                if (!empty($insertData)) {
                    Thongbao::insert($insertData);
                }
            }
            DB::commit();

            return response()->json([
                'message' => 'Đã gửi thông báo thành công đến ' . $userIds->count() . ' người dùng.',
                'count' => $userIds->count()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Broadcast Notification Error: " . $e->getMessage());
            return response()->json(['message' => 'Lỗi máy chủ khi gửi thông báo.'], 500);
        }
    }
}