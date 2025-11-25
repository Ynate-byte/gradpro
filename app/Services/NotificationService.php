<?php

namespace App\Services;

use App\Models\Thongbao;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Gửi thông báo đến một người dùng.
     * * @param int $receiverId ID_NGUOINHAN
     * @param string $title TIEU_DE
     * @param string $content NOI_DUNG
     * @param string $type LOAI_THONGBAO ('SYSTEM', 'GROUP', 'TASK', 'ACADEMIC')
     * @param string|null $link LIEN_KET
     * @param array|null $metaData DU_LIEU_GOC
     */
    public static function send($receiverId, $title, $content, $type = 'SYSTEM', $link = null, $metaData = null)
    {
        try {
            $validTypes = ['SYSTEM', 'GROUP', 'TASK', 'ACADEMIC'];
            
            if (!in_array($type, $validTypes)) {
                $type = 'SYSTEM';
            }

            Thongbao::create([
                'ID_NGUOINHAN'  => $receiverId,
                'TIEU_DE'       => $title,
                'NOI_DUNG'      => $content,
                'LOAI_THONGBAO' => $type,
                'LIEN_KET'      => $link,
                'DU_LIEU_GOC'   => $metaData,
                'DA_DOC'        => false,
                'NGAY_TAO'      => now(),
            ]);
        } catch (\Exception $e) {
            Log::error("NotificationService Error: " . $e->getMessage());
        }
    }
}