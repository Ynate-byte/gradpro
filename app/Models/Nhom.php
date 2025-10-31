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
        'ID_KEHOACH',
        'TEN_NHOM',
        'MOTA',
        'ID_NHOMTRUONG',
        'ID_CHUYENNGANH',
        'ID_KHOA_BOMON',
        'SO_THANHVIEN_HIENTAI',
        'LA_NHOM_DACBIET',
    ];
    
    public function kehoach()
    {
        return $this->belongsTo(KehoachKhoaluan::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }

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
        return $this->hasMany(ThanhvienNhom::class, 'ID_NHOM', 'ID_NHOM');
    }
    public function phancongDetaiNhom()
    {
        return $this->hasOne(PhancongDetaiNhom::class, 'ID_NHOM', 'ID_NHOM');
    }

    public function detai()
    {
        return $this->hasOneThrough(Detai::class, PhancongDetaiNhom::class, 'ID_NHOM', 'ID_DETAI', 'ID_NHOM', 'ID_DETAI');
    }
}