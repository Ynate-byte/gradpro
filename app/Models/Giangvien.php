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
        'CHUCVU',
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
}