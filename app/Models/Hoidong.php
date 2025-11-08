<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Hoidong extends Model
{
    use HasFactory;

    protected $table = 'HOIDONG';
    protected $primaryKey = 'ID_HOIDONG';
    // public $timestamps = false; // Bảng gốc có timestamps

    protected $fillable = [
        'TEN_HOIDONG',
        'LOAI',
        'ID_KEHOACH',
        'ID_CHUYENNGANH',
        'NGAY_BAOCAO',
        'GIO_BAOCAO',
        'PHONG',
    ];

    /**
     * 🔹 Quan hệ: Hội đồng thuộc về 1 kế hoạch khóa luận
     */
    public function kehoach()
    {
        return $this->belongsTo(KehoachKhoaluan::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }

    /**
     * 🔹 Quan hệ: Hội đồng thuộc về 1 chuyên ngành
     */
    public function chuyennganh()
    {
        return $this->belongsTo(Chuyennganh::class, 'ID_CHUYENNGANH', 'ID_CHUYENNGANH');
    }

    /**
     * 🔹 Quan hệ N-N với Giảng viên qua bảng HOIDONG_GIANGVIEN
     */
    public function giangviens()
    {
        return $this->belongsToMany(
            Giangvien::class,
            'HOIDONG_GIANGVIEN',
            'ID_HOIDONG',
            'ID_GIANGVIEN'
        )
        ->withPivot('VAITRO')
        ->withTimestamps();
    }

    /**
     * 🔹 Quan hệ N-N với Nhóm (bảng hoidong_nhom)
     */
    public function nhoms()
    {
        return $this->belongsToMany(
            Nhom::class,
            'HOIDONG_NHOM',   // Tên bảng pivot
            'ID_HOIDONG',
            'ID_NHOM'
        )->withTimestamps();
    }

    /**
     * 🔹 Lấy danh sách giảng viên theo vai trò trong hội đồng
     * -> $hoidong->getGiangviensByRole('Chủ tịch');
     */
    public function getGiangviensByRole($role)
    {
        return $this->giangviens()->wherePivot('VAITRO', $role)->get();
    }

    /**
     * 🔹 Hàm tiện ích: Kiểm tra giảng viên có thuộc hội đồng này không
     */
    public function hasGiangvien($giangvienId)
    {
        return $this->giangviens()->where('HOIDONG_GIANGVIEN.ID_GIANGVIEN', $giangvienId)->exists();
    }
}