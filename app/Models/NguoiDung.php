<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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
        'NGAYSINH',
        'SO_DIENTHOAI',
        'ID_VAITRO',
        'LA_DANGNHAP_LANDAU',
        'TRANGTHAI_KICHHOAT',
    ];
    
    protected $casts = [
        'NGAYSINH' => 'date',
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

    public function thanhvienNhom()
    {
        return $this->hasMany(ThanhvienNhom::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }
        public function submissions(): HasMany
    {
        return $this->hasMany(NopSanpham::class, 'ID_NGUOI_NOP', 'ID_NGUOIDUNG');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(NopSanpham::class, 'ID_NGUOI_XACNHAN', 'ID_NGUOIDUNG');
    }
    public function lichHopsDaTao(): HasMany
    {
        return $this->hasMany(LichHop::class, 'ID_NGUOITAO', 'ID_NGUOIDUNG');
    }

    public function congViecDuocGiao(): BelongsToMany
    {
        return $this->belongsToMany(
            CongViec::class,
            'PHANCONG_CONGVIEC',
            'ID_NGUOIDUNG',
            'ID_CONGVIEC'
        );
    }

    public function binhLuanCongViecs(): HasMany
    {
        return $this->hasMany(BinhLuanCongViec::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }
}
