<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DiemHoiDong extends Model
{
    use HasFactory;

    protected $table = 'DIEM_HOIDONG';
    protected $primaryKey = 'ID_DIEM_HDONG';

    protected $fillable = ['ID_NHOM', 'ID_GIANGVIEN', 'DIEM', 'NHANXET', 'DIEM_CHI_TIET'];

    protected $casts = [
        'DIEM_CHI_TIET' => 'array',
    ];
    
    public function nhom()
    {
        return $this->belongsTo(Nhom::class, 'ID_NHOM', 'ID_NHOM');
    }

    public function giangvien()
    {
        return $this->belongsTo(Giangvien::class, 'ID_GIANGVIEN', 'ID_GIANGVIEN');
    }
}