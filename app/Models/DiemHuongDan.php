<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DiemHuongDan extends Model
{
    use HasFactory;

    protected $table = 'DIEM_HUONGDAN'; // Giữ nguyên chữ hoa như migration
    protected $primaryKey = 'ID_DIEM_HD';
    public $timestamps = true;

    protected $fillable = ['ID_NHOM', 'ID_GIANGVIEN', 'DIEM', 'NHANXET'];

    // 🔹 Quan hệ
    public function nhom()
    {
        return $this->belongsTo(Nhom::class, 'ID_NHOM', 'ID_NHOM');
    }

    public function giangvien()
    {
        return $this->belongsTo(Giangvien::class, 'ID_GIANGVIEN', 'ID_GIANGVIEN');
    }
}