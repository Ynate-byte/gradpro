<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KehoachKhoaluan extends Model
{
    use HasFactory;

    protected $table = 'KEHOACH_KHOALUAN';
    protected $primaryKey = 'ID_KEHOACH';

    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = 'NGAYCAPNHAT';

    protected $fillable = [
        'TEN_DOT',
        'NAMHOC',
        'HOCKY',
        'KHOAHOC',
        'HEDAOTAO',
        'SO_THANHVIEN_TOITHIEU',
        'SO_THANHVIEN_TOIDA',
        'TRANGTHAI',
        'TRANGTHAI_KICHHOAT',
        'NGAY_BATDAU',
        'NGAY_KETHUC',
        'ID_NGUOITAO',
        'BINHLUAN_PHEDUYET',
        'TYTRONG_DIEM_QUATRINH',
        'TYTRONG_DIEM_HOIDONG',
    ];

    public function mocThoigians()
    {
        return $this->hasMany(MocThoigian::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }

    public function sinhvienThamgias()
    {
        return $this->hasMany(SinhvienThamgia::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }

    public function nguoiTao()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOITAO', 'ID_NGUOIDUNG');
    }

    public function nhoms()
    {
        return $this->hasMany(Nhom::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }
}