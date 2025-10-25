<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SinhvienThamgia extends Model
{
    use HasFactory;

    protected $table = 'SINHVIEN_THAMGIA';
    protected $primaryKey = 'ID_THAMGIA';
    public $timestamps = false;

    protected $fillable = [
        'ID_KEHOACH',
        'ID_SINHVIEN',
        'DU_DIEUKIEN',
        'NGAY_DANGKY',
    ];

    public function kehoach()
    {
        return $this->belongsTo(KehoachKhoaluan::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }

    public function sinhvien()
    {
        return $this->belongsTo(Sinhvien::class, 'ID_SINHVIEN', 'ID_SINHVIEN');
    }
}