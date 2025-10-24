<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoimoiNhom extends Model
{
    use HasFactory;
    protected $table = 'LOIMOI_NHOM';
    protected $primaryKey = 'ID_LOIMOI';
    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = null;

    const STATUS_PENDING = 'Đang chờ';
    const STATUS_ACCEPTED = 'Chấp nhận';
    const STATUS_DECLINED = 'Từ chối';
    const STATUS_EXPIRED = 'Hết hạn';
    const STATUS_CANCELLED = 'Đã hủy';

    protected $fillable = [
        'ID_NHOM',
        'ID_NGUOI_DUOCMOI',
        'ID_NGUOIMOI',
        'LOINHAN',
        'TRANGTHAI',
        'NGAY_HETHAN',
        'NGAY_PHANHOI',
    ];

    /**
     * Lấy thông tin nhóm của lời mời.
     */
    public function nhom()
    {
        return $this->belongsTo(Nhom::class, 'ID_NHOM', 'ID_NHOM');
    }

    /**
     * Lấy thông tin người được mời.
     */
    public function nguoiduocmoi()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOI_DUOCMOI', 'ID_NGUOIDUNG');
    }

    /**
     * Lấy thông tin người mời.
     */
    public function nguoimoi()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOIMOI', 'ID_NGUOIDUNG');
    }
}