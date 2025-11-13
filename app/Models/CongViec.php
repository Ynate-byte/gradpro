<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CongViec extends Model
{
    use HasFactory;
    protected $table = 'CONGVIEC';
    protected $primaryKey = 'ID_CONGVIEC';
    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = 'NGAYCAPNHAT'; // Đã sửa ở lần trước

    protected $fillable = [
        'ID_NHOM',
        'ID_COT',
        'ID_NGUOITAO',
        'TEN_CONGVIEC',
        'MOTA',
        'TRANGTHAI',
        'NGAY_BATDAU',
        'NGAY_HETHAN',
        'DO_UUTIEN',
        'THUTU_HIENTHI',
        'NGAY_HOANTHANH',
    ];

    protected $casts = [
        'NGAY_BATDAU' => 'datetime',
        'NGAY_HETHAN' => 'datetime',
        'NGAY_HOANTHANH' => 'datetime',
        'NGAYTAO' => 'datetime',
        'NGAYCAPNHAT' => 'datetime',
    ];

    public function nhom(): BelongsTo
    {
        return $this->belongsTo(Nhom::class, 'ID_NHOM', 'ID_NHOM');
    }

    public function cot(): BelongsTo
    {
        return $this->belongsTo(CotCongViec::class, 'ID_COT', 'ID_COT');
    }

    public function nguoiTao(): BelongsTo
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOITAO', 'ID_NGUOIDUNG');
    }

    public function phanCongs(): HasMany
    {
        return $this->hasMany(PhanCongCongViec::class, 'ID_CONGVIEC', 'ID_CONGVIEC');
    }

    public function nguoiDuocPhanCong(): BelongsToMany
    {
        return $this->belongsToMany(
            Nguoidung::class,
            'PHANCONG_CONGVIEC',
            'ID_CONGVIEC',
            'ID_NGUOIDUNG'
        );
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(DanhSachKiemTraCongViec::class, 'ID_CONGVIEC', 'ID_CONGVIEC');
    }

    // ===== [SỬA LỖI TẠI ĐÂY] =====

    /**
     * Lấy TẤT CẢ bình luận (dùng để tạo).
     */
    public function allComments(): HasMany
    {
        return $this->hasMany(BinhLuanCongViec::class, 'ID_CONGVIEC', 'ID_CONGVIEC');
    }

    /**
     * Lấy các bình luận (chỉ bình luận gốc, level 0, dùng để hiển thị).
     */
    public function binhLuans(): HasMany
    {
        return $this->hasMany(BinhLuanCongViec::class, 'ID_CONGVIEC', 'ID_CONGVIEC')
                    ->whereNull('ID_BINHLUAN_CHA');
    }
    // ============================
}