<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PhancongGvDetai extends Model
{
    use HasFactory;

    protected $table = 'PHANCONG_GV_DETAI';
    protected $primaryKey = 'ID_PHANCONG';
    const CREATED_AT = 'NGAY_PHANCONG';
    const UPDATED_AT = null;

    protected $fillable = [
        'ID_DETAI',
        'ID_GIANGVIEN',
        'ID_NGUOI_PHANCONG',
        'SO_DETAI_PHANCONG',
        'GHICHU',
        'TRANGTHAI',
        'NGAY_PHANCONG',
\    ];

    public function detai()
    {
        return $this->belongsTo(Detai::class, 'ID_DETAI', 'ID_DETAI');
    }
}