<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Nhom extends Model
{
    use HasFactory;

    protected $table = 'NHOM';
    protected $primaryKey = 'ID_NHOM';
    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = 'NGAYCAPNHAT';

    protected $fillable = [
        // 'ID_DOT',
        'TEN_NHOM',
        'MOTA',
        'ID_NHOMTRUONG',
        'ID_CHUYENNGANH',
        'ID_KHOA_BOMON',
        'SO_THANHVIEN_HIENTAI'
    ];

    public function nhomtruong()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NHOMTRUONG', 'ID_NGUOIDUNG');
    }

    public function thanhviens()
    {
        return $this->hasMany(ThanhvienNhom::class, 'ID_NHOM', 'ID_NHOM');
    }

    public function chuyennganh()
    {
        return $this->belongsTo(Chuyennganh::class, 'ID_CHUYENNGANH', 'ID_CHUYENNGANH');
    }

    public function khoabomon()
    {
        return $this->belongsTo(KhoaBomon::class, 'ID_KHOA_BOMON', 'ID_KHOA_BOMON');
    }

    public function loimois()
    {
        return $this->hasMany(LoimoiNhom::class, 'ID_NHOM', 'ID_NHOM');
    }

    public function yeucaus()
    {
        return $this->hasMany(YeucauVaoNhom::class, 'ID_NHOM', 'ID_NHOM');
    }
        public function thanhvienNhom()
    {
        return $this->hasOne(ThanhvienNhom::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }
    
}