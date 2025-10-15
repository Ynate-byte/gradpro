<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class YeucauVaoNhom extends Model
{
    use HasFactory;
    protected $table = 'YEUCAU_VAONHOM';
    protected $primaryKey = 'ID_YEUCAU';
    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = null;

    protected $fillable = [
        'ID_NHOM',
        'ID_NGUOIDUNG',
        'LOINHAN',
        'TRANGTHAI',
        'NGAY_PHANHOI',
        'ID_NGUOI_PHANHOI',
    ];
        public function nhom()
    {
        return $this->belongsTo(Nhom::class, 'ID_NHOM', 'ID_NHOM');
    }

    public function nguoidung()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }
}