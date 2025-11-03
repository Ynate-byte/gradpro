<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TyTrongDiem extends Model
{
    use HasFactory;

    protected $table = 'TYTRONG_DIEM';
    protected $primaryKey = 'ID_TYTRONG';
    // public $timestamps = false; // Bảng gốc có timestamps

    protected $fillable = ['HUONGDAN', 'PHANBIEN', 'HOIDONG', 'ACTIVE'];

    /**
     * 🔹 Lấy tỷ trọng hiện hành (ACTIVE = 1)
     */
    public static function getCurrent()
    {
        return self::where('ACTIVE', true)->first();
    }

    /**
     * 🔹 Cập nhật tỷ trọng mới (vô hiệu hóa bản cũ)
     */
    public static function updateTyTrong($huongdan, $phanbien, $hoidong)
    {
        // Tắt tất cả các tỷ trọng cũ
        self::query()->update(['ACTIVE' => false]);
        
        // Tạo tỷ trọng mới và kích hoạt
        return self::create([
            'HUONGDAN' => $huongdan,
            'PHANBIEN' => $phanbien,
            'HOIDONG' => $hoidong,
            'ACTIVE' => true,
        ]);
    }
}