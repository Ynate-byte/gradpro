<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NopSanpham extends Model
{
    use HasFactory;
    protected $table = 'NOP_SANPHAM';
    protected $primaryKey = 'ID_NOP_SANPHAM';

    // Chỉ có NGAY_NOP được tự động quản lý khi tạo
    const CREATED_AT = 'NGAY_NOP';
    const UPDATED_AT = null; // Không dùng updated_at

    protected $fillable = [
        'ID_PHANCONG',
        'ID_NGUOI_NOP',
        'TRANGTHAI',
        'PHANHOI_ADMIN',
        'ID_NGUOI_XACNHAN',
        'NGAY_XACNHAN',
        'NGAY_NOP',
    ];

    protected $casts = [
        'NGAY_NOP' => 'datetime',
        'NGAY_XACNHAN' => 'datetime',
    ];

    // Lần nộp này thuộc về phân công nào
    public function phancong(): BelongsTo
    {
        return $this->belongsTo(PhancongDetaiNhom::class, 'ID_PHANCONG', 'ID_PHANCONG');
    }

    // Người nộp (Sinh viên)
    public function nguoiNop(): BelongsTo
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOI_NOP', 'ID_NGUOIDUNG');
    }

    // Người xác nhận (Admin/GVu/TKhoa)
    public function nguoiXacNhan(): BelongsTo
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOI_XACNHAN', 'ID_NGUOIDUNG');
    }

    // Các file/links thuộc lần nộp này
    public function files(): HasMany
    {
        return $this->hasMany(FileNopSanpham::class, 'ID_NOP_SANPHAM', 'ID_NOP_SANPHAM');
    }
}