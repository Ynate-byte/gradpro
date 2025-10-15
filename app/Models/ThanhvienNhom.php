<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ThanhvienNhom extends Model
{
    use HasFactory;

    protected $table = 'THANHVIEN_NHOM';
    protected $primaryKey = 'ID_THANHVIEN';
    public $timestamps = false;

    protected $fillable = ['ID_NHOM', 'ID_NGUOIDUNG'];

    public function nguoidung()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }

    public function nhom()
    {
        return $this->belongsTo(Nhom::class, 'ID_NHOM', 'ID_NHOM');
    }
}