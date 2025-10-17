<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Nguoidung extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'NGUOIDUNG';
    protected $primaryKey = 'ID_NGUOIDUNG';

    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = 'NGAYCAPNHAT';

    protected $fillable = [
        'MA_DINHDANH',
        'EMAIL',
        'MATKHAU_BAM',
        'HODEM_VA_TEN',
        'SO_DIENTHOAI',
        'ID_VAITRO',
        'LA_DANGNHAP_LANDAU',
        'TRANGTHAI_KICHHOAT',
    ];

    protected $hidden = [
        'MATKHAU_BAM',
    ];

    public function getAuthPassword()
    {
        return $this->MATKHAU_BAM;
    }

    public function vaitro()
    {
        return $this->belongsTo(Vaitro::class, 'ID_VAITRO', 'ID_VAITRO');
    }

    public function sinhvien()
    {
        return $this->hasOne(Sinhvien::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }

    public function giangvien()
    {
        return $this->hasOne(Giangvien::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }
    
    public function notifications()
    {
        return $this->hasMany(Notification::class, 'user_id', 'ID_NGUOIDUNG');
    }

    // =================================================================
    // === 👇 BẮT BUỘC THÊM FUNCTION NÀY VÀO ĐỂ SỬA LỖI 👇 ===
    // =================================================================
    /**
     * Định nghĩa quan hệ một-một đến bảng ThanhvienNhom.
     * Dùng để kiểm tra xem người dùng đã thuộc nhóm nào chưa.
     */
    public function thanhvienNhom()
    {
        return $this->hasOne(ThanhvienNhom::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }
}