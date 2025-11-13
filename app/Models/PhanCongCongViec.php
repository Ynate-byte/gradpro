<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhanCongCongViec extends Model
{
    use HasFactory;
    protected $table = 'PHANCONG_CONGVIEC';
    protected $primaryKey = 'ID_PHANCONG';
    const CREATED_AT = 'NGAY_PHANCONG';
    const UPDATED_AT = null; // Không có

    protected $fillable = ['ID_CONGVIEC', 'ID_NGUOIDUNG'];

    public function congViec(): BelongsTo
    {
        return $this->belongsTo(CongViec::class, 'ID_CONGVIEC', 'ID_CONGVIEC');
    }

    public function nguoiDung(): BelongsTo
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }
}