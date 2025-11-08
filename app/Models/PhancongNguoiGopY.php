<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PhancongNguoiGopY extends Model
{
    use HasFactory;

    protected $table = 'phancong_nguoi_gop_y';
    protected $primaryKey = 'ID_PHANCONG_NGUOI_GOP_Y';
    public $timestamps = true;

    protected $fillable = [
        'ID_DETAI',
        'ID_GIANGVIEN',
        'ID_NGUOI_PHANCONG',
        'GHICHU',
        'TRANGTHAI',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship with Detai (Topic)
     */
    public function detai()
    {
        return $this->belongsTo(Detai::class, 'ID_DETAI', 'ID_DETAI');
    }

    /**
     * Relationship with Giangvien (Reviewer)
     */
    public function giangvien()
    {
        return $this->belongsTo(Giangvien::class, 'ID_GIANGVIEN', 'ID_GIANGVIEN');
    }

    /**
     * Relationship with Nguoidung (Person who assigned)
     */
    public function nguoiPhancong()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOI_PHANCONG', 'ID_NGUOIDUNG');
    }
}
