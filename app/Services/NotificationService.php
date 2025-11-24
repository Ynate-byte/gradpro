<?php

namespace App\Services;

use App\Models\Thongbao;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Gửi thông báo đến một người dùng.
     *
     * @param int $receiverId ID người nhận (ID_NGUOIDUNG)
     * @param string $title Tiêu đề ngắn gọn
     * @param string $content Nội dung chi tiết
     * @param string $type Loại: SYSTEM, GROUP, TASK, ACADEMIC
     * @param string|null $link Đường dẫn frontend (Route)
     * @param array|null $metaData Dữ liệu gốc (ID,...)
     */
    public static function send($receiverId, $title, $content, $type = 'SYSTEM', $link = null, $metaData = null)
    {
        try {
            Thongbao::create([
                'ID_NGUOINHAN' => $receiverId,
                'TIEU_DE' => $title,
                'NOI_DUNG' => $content,
                'LOAI_THONGBAO' => $type,
                'LIEN_KET' => $link,
                'DU_LIEU_GOC' => $metaData,
                'DA_DOC' => false,
                'NGAY_TAO' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error("Lỗi gửi thông báo (NotificationService)", [
            'receiver_id' => $receiverId,
            'type' => $type,
            'title' => $title,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        }
    }
}