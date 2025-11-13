<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BinhLuanCongViec extends Model
{
    use HasFactory;
    protected $table = 'BINHLUAN_CONGVIEC';
    protected $primaryKey = 'ID_BINHLUAN';
    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = 'NGAYCAPNHAT';

    protected $fillable = [
        'ID_CONGVIEC',
        'ID_NGUOIDUNG',
        'ID_BINHLUAN_CHA',
        'NOIDUNG_BINHLUAN',
    ];

    public function congViec(): BelongsTo
    {
        return $this->belongsTo(CongViec::class, 'ID_CONGVIEC', 'ID_CONGVIEC');
    }

    public function nguoiBinhLuan(): BelongsTo
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }

    /**
     * Lấy bình luận cha (nếu có).
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(BinhLuanCongViec::class, 'ID_BINHLUAN_CHA', 'ID_BINHLUAN');
    }

    /**
     * Lấy các bình luận trả lời (replies).
     */
    public function replies(): HasMany
    {
        return $this->hasMany(BinhLuanCongViec::class, 'ID_BINHLUAN_CHA', 'ID_BINHLUAN');
    }
}