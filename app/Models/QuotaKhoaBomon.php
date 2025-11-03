<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuotaKhoaBomon extends Model
{
    use HasFactory;

    protected $table = 'QUOTA_KHOA_BOMON';
    protected $primaryKey = 'ID_QUOTA';
    const CREATED_AT = 'NGAY_PHANCONG';
    const UPDATED_AT = null;

    protected $fillable = [
        'ID_KEHOACH',
        'ID_KHOA_BOMON',
        'ID_NGUOI_PHANCONG',
        'SO_DETAI_QUOTA',
        'GHICHU',
        'TRANGTHAI',
    ];

    protected $casts = [
        'NGAY_PHANCONG' => 'datetime',
    ];

    public function kehoach()
    {
        return $this->belongsTo(KehoachKhoaluan::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }

    public function khoaBomon()
    {
        return $this->belongsTo(KhoaBomon::class, 'ID_KHOA_BOMON', 'ID_KHOA_BOMON');
    }

    public function nguoiPhancong()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOI_PHANCONG', 'ID_NGUOIDUNG');
    }

    /**
     * Check if quota can be deleted (no topics created yet)
     */
    public function canDelete()
    {
        // Check if any lecturer in this department has created topics for this plan
        return !Detai::where('ID_KEHOACH', $this->ID_KEHOACH)
            ->whereHas('nguoiDexuat', function($q) {
                $q->where('ID_KHOA_BOMON', $this->ID_KHOA_BOMON);
            })
            ->exists();
    }
}
