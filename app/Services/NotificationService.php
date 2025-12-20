<?php

namespace App\Services;

use App\Models\Thongbao;
use Illuminate\Support\Facades\Log;
use App\Events\NewNotification;

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
     * @param string $priority DO_UU_TIEN ('NORMAL', 'HIGH', 'URGENT')
     */
    public static function send($receiverId, $title, $content, $type = 'SYSTEM', $link = null, $metaData = null, $priority = 'NORMAL')
    {
        try {
            $validTypes = ['SYSTEM', 'GROUP', 'TASK', 'ACADEMIC'];
            if (!in_array($type, $validTypes)) {
                $type = 'SYSTEM';
            }

            $validPriorities = ['NORMAL', 'HIGH', 'URGENT'];
            if (!in_array($priority, $validPriorities)) {
                $priority = 'NORMAL';
            }

            Thongbao::create([
                'ID_NGUOINHAN'  => $receiverId,
                'TIEU_DE'       => $title,
                'NOI_DUNG'      => $content,
                'LOAI_THONGBAO' => $type,
                'DO_UU_TIEN'    => $priority,
                'LIEN_KET'      => $link,
                'DU_LIEU_GOC'   => $metaData,
                'DA_DOC'        => false,
                'NGAY_TAO'      => now(),
            ]);

            broadcast(new NewNotification($notification))->toOthers();
            
        } catch (\Exception $e) {
            Log::error("NotificationService Error: " . $e->getMessage());
        }
    }
}