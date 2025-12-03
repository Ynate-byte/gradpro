<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Giangvien extends Model
{
    use HasFactory;

    protected $table = 'GIANGVIEN';
    protected $primaryKey = 'ID_GIANGVIEN';
    public $timestamps = false;

    protected $fillable = [
        'ID_NGUOIDUNG',
        'ID_KHOA_BOMON',
        'HOCVI',
        'CHUYENMON',
        'SO_NHOM_TOIDA',
    ];

    public function nguoidung()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }

    public function khoabomon()
    {
        return $this->belongsTo(KhoaBomon::class, 'ID_KHOA_BOMON', 'ID_KHOA_BOMON');
    }
    
    public function chucvus()
    {
        return $this->belongsToMany(ChucVu::class, 'GIANGVIEN_CHUCVU', 'ID_GIANGVIEN', 'ID_CHUCVU');
    }
    
    public function hasChucVu($maChucVu)
    {
        return $this->chucvus->contains('MA_CHUCVU', $maChucVu);
    }

    public function detai()
    {
        return $this->hasMany(Detai::class, 'ID_NGUOI_DEXUAT', 'ID_GIANGVIEN');
    }

    public function quotaGiangviens()
    {
        return $this->hasMany(QuotaGiangvien::class, 'ID_GIANGVIEN', 'ID_GIANGVIEN');
    }

    public function phancongGvDetais()
    {
        return $this->hasMany(PhancongGvDetai::class, 'ID_GIANGVIEN', 'ID_GIANGVIEN');
    }
    
    public function detais()
    {
        return $this->hasMany(Detai::class, 'ID_NGUOI_DEXUAT', 'ID_GIANGVIEN');
    }

    public function hoidongs()
    {
        return $this->belongsToMany(
            \App\Models\Hoidong::class,
            'HOIDONG_GIANGVIEN',
            'ID_GIANGVIEN',
            'ID_HOIDONG'
        )->withPivot('VAITRO');
    }
}