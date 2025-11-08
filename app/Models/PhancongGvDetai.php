<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhancongGvDetai extends Model
{
    use HasFactory;

    protected $table = 'PHANCONG_GV_DETAI';
    protected $primaryKey = 'ID_PHANCONG_GV';
    public $timestamps = false;

    protected $fillable = [
        'ID_GIANGVIEN',
        'ID_DETAI',
        'SO_DETAI_PHANCONG',
        'ID_NGUOI_PHANCONG',
        'NGAY_PHANCONG',
        'GHICHU',
        'TRANGTHAI',
    ];

    protected $casts = [
        'NGAY_PHANCONG' => 'datetime',
        'SO_DETAI_PHANCONG' => 'integer',
    ];

    /**
     * Relationship with Giangvien (Lecturer)
     */
    public function giangvien(): BelongsTo
    {
        return $this->belongsTo(Giangvien::class, 'ID_GIANGVIEN', 'ID_GIANGVIEN');
    }

    /**
     * Relationship with Detai (Topic)
     */
    public function detai(): BelongsTo
    {
        return $this->belongsTo(Detai::class, 'ID_DETAI', 'ID_DETAI');
    }

    /**
     * Relationship with Nguoidung (User who assigned)
     */
    public function nguoiPhancong(): BelongsTo
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOI_PHANCONG', 'ID_NGUOIDUNG');
    }

    /**
     * Scope for active assignments
     */
    public function scopeActive($query)
    {
        return $query->where('TRANGTHAI', 'Đang phân công');
    }

    /**
     * Scope for quota assignments (no specific topic)
     */
    public function scopeQuotaAssignments($query)
    {
        return $query->whereNull('ID_DETAI');
    }

    /**
     * Scope for specific topic assignments
     */
    public function scopeTopicAssignments($query)
    {
        return $query->whereNotNull('ID_DETAI');
    }
}
