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
            'ID_KEHOACH' => 'nullable|exists:KEHOACH_KHOALUAN,ID_KEHOACH',
            // [MỚI] Validate mức độ ưu tiên
            'DO_UU_TIEN' => 'nullable|in:NORMAL,HIGH,URGENT'
        ]);

        $target = $validated['DOI_TUONG'];
        $planId = $validated['ID_KEHOACH'] ?? null;
        $priority = $validated['DO_UU_TIEN'] ?? 'NORMAL'; // Mặc định NORMAL
        $senderId = auth()->id();

        try {
            $query = Nguoidung::where('TRANGTHAI_KICHHOAT', true);

            if ($target === 'STUDENT') {
                $query->whereHas('vaitro', function ($q) {
                    $q->where('TEN_VAITRO', 'Sinh viên');
                });

                if ($planId) {
                    $query->whereHas('sinhvien.cacDotThamGia', function ($q) use ($planId) {
                        $q->where('ID_KEHOACH', $planId);
                    });
                }
            } elseif ($target === 'LECTURER') {
                $query->whereHas('vaitro', function ($q) {
                    $q->where('TEN_VAITRO', 'Giảng viên');
                });
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
                        'DO_UU_TIEN' => $priority, // <--- [MỚI] Lưu priority vào bulk insert
                        'LIEN_KET' => $validated['LIEN_KET'] ?? null,
                        'DU_LIEU_GOC' => json_encode([
                            'sender_id' => $senderId, 
                            'type' => 'broadcast',
                            'plan_id' => $planId
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