<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DanhSachKiemTraCongViec extends Model
{
    use HasFactory;
    protected $table = 'DANHSACH_KIEMTRA_CONGVIEC';
    protected $primaryKey = 'ID_MUCON';
    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = null; // Không có

    protected $fillable = [
        'ID_CONGVIEC',
        'NOIDUNG_MUC',
        'DA_HOANTHANH',
        'THUTU_HIENTHI',
    ];

    protected $casts = [
        'DA_HOANTHANH' => 'boolean',
    ];

    public function congViec(): BelongsTo
    {
        return $this->belongsTo(CongViec::class, 'ID_CONGVIEC', 'ID_CONGVIEC');
    }
}