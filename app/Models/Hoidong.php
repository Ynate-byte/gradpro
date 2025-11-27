<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Hoidong extends Model
{
    use HasFactory;

    protected $table = 'HOIDONG';
    protected $primaryKey = 'ID_HOIDONG';

    protected $fillable = [
        'TEN_HOIDONG',
        'LOAI',
        'ID_KEHOACH',
        'ID_KHOA_BOMON', // [SỬA] Thay ID_CHUYENNGANH bằng ID_KHOA_BOMON
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
     * 🔹 [SỬA] Quan hệ: Hội đồng thuộc về 1 Khoa/Bộ môn
     */
    public function khoaBomon()
    {
        return $this->belongsTo(KhoaBomon::class, 'ID_KHOA_BOMON', 'ID_KHOA_BOMON');
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