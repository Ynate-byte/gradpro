<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotaGiangvien extends Model
{
    use HasFactory;

    protected $table = 'QUOTA_GIANGVIEN';
    protected $primaryKey = 'ID_QUOTA';
    public $timestamps = false;

    protected $fillable = [
        'ID_KEHOACH',
        'ID_GIANGVIEN',
        'ID_NGUOI_PHANCONG',
        'SO_DETAI_QUOTA',
        'NGAY_PHANCONG',
        'GHICHU',
        'TRANGTHAI',
    ];

    protected $casts = [
        'NGAY_PHANCONG' => 'datetime',
        'SO_DETAI_QUOTA' => 'integer',
    ];

    // Relationships
    public function kehoach(): BelongsTo
    {
        return $this->belongsTo(KehoachKhoaluan::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }

    public function giangvien(): BelongsTo
    {
        return $this->belongsTo(Giangvien::class, 'ID_GIANGVIEN', 'ID_GIANGVIEN');
    }

    public function nguoiPhancong(): BelongsTo
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOI_PHANCONG', 'ID_NGUOIDUNG');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('TRANGTHAI', 'Đang phân công');
    }

    public function scopeByLecturer($query, $lecturerId)
    {
        return $query->where('ID_GIANGVIEN', $lecturerId);
    }

    public function scopeByPlan($query, $planId)
    {
        return $query->where('ID_KEHOACH', $planId);
    }

    // Methods
    public function getUsedQuota()
    {
        return Detai::where('ID_KEHOACH', $this->ID_KEHOACH)
            ->where('ID_NGUOI_DEXUAT', $this->ID_GIANGVIEN)
            ->whereIn('TRANGTHAI', ['Đã duyệt', 'Chờ duyệt', 'Nháp'])
            ->count();
    }

    public function getRemainingQuota()
    {
        return max(0, $this->SO_DETAI_QUOTA - $this->getUsedQuota());
    }

    public function canDelete()
    {
        return $this->getUsedQuota() === 0;
    }
}
