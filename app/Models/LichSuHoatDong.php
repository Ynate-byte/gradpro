<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LichSuHoatDong extends Model
{
    use HasFactory;

    protected $table = 'LICH_SU_HOAT_DONG';
    protected $primaryKey = 'ID_LICHSU';
    public $timestamps = false; // Chúng ta tự quản lý NGAY_TAO

    protected $fillable = [
        'ID_NGUOIDUNG',
        'ID_NHOM',
        'LOAI_HANH_DONG',
        'TIEU_DE',
        'CHI_TIET',
        'ICON',
        'NGAY_TAO'
    ];

    protected $casts = [
        'CHI_TIET' => 'array', // Tự động chuyển JSON sang Array
        'NGAY_TAO' => 'datetime',
    ];

    public function nguoidung()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }

    public function nhom()
    {
        return $this->belongsTo(Nhom::class, 'ID_NHOM', 'ID_NHOM');
    }
}