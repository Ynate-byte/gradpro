<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DiemTongKet extends Model
{
    use HasFactory;

    protected $table = 'DIEM_TONGKET';
    protected $primaryKey = 'ID_DIEMTK';
    protected $fillable = ['ID_NHOM', 'DIEM_HD', 'DIEM_PB', 'DIEM_HDONG', 'DIEM_TONG'];
    // public $timestamps = false; // Bảng gốc có timestamps

    public function nhom()
    {
        return $this->belongsTo(Nhom::class, 'ID_NHOM', 'ID_NHOM');
    }

    public function diemHuongDan()
    {
        return $this->hasMany(DiemHuongDan::class, 'ID_NHOM', 'ID_NHOM');
    }

    public function diemPhanBien()
    {
        return $this->hasMany(DiemPhanBien::class, 'ID_NHOM', 'ID_NHOM');
    }

    public function diemHoiDong()
    {
        return $this->hasMany(DiemHoiDong::class, 'ID_NHOM', 'ID_NHOM');
    }
}