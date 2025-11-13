<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LichHop extends Model
{
    use HasFactory;

    protected $table = 'LICHHOP';
    protected $primaryKey = 'ID_LICHHOP';

    // Định nghĩa tên cột timestamp
    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = 'CAPNHAT_LANCUOI';

    protected $fillable = [
        'ID_NHOM',
        'ID_NGUOITAO',
        'TIEUDE_LICHHOP',
        'THOIGIAN_BATDAU',
        'THOIGIAN_KETTHUC',
        'HINHTHUC_HOP',
        'DIADIEM',
        'LINK_TRUCTUYEN',
        'GHICHU',
        'TRANGTHAI',
    ];

    protected $casts = [
        'THOIGIAN_BATDAU' => 'datetime',
        'THOIGIAN_KETTHUC' => 'datetime',
        'NGAYTAO' => 'datetime',
        'CAPNHAT_LANCUOI' => 'datetime',
    ];

    /**
     * Lịch họp này thuộc về nhóm nào.
     */
    public function nhom(): BelongsTo
    {
        return $this->belongsTo(Nhom::class, 'ID_NHOM', 'ID_NHOM');
    }

    /**
     * Người đã tạo lịch họp (GVHD hoặc Nhóm trưởng).
     */
    public function nguoiTao(): BelongsTo
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOITAO', 'ID_NGUOIDUNG');
    }
}