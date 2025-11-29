<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class KehoachKhoaluan extends Model
{
    use HasFactory;

    protected $table = 'KEHOACH_KHOALUAN';
    protected $primaryKey = 'ID_KEHOACH';

    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = 'NGAYCAPNHAT';

    protected $fillable = [
        'TEN_DOT',
        'NAMHOC',
        'HOCKY',
        'KHOAHOC',
        'HEDAOTAO',
        'SO_TUAN_THUCHIEN',
        'SO_THANHVIEN_TOITHIEU',
        'SO_THANHVIEN_TOIDA',
        'SO_NHOM_DUKIEN',
        'TRANGTHAI',
        'TRANGTHAI_KICHHOAT',
        'NGAY_BATDAU',
        'NGAY_KETHUC',
        'ID_NGUOITAO',
        'BINHLUAN_PHEDUYET',
        'TYTRONG_DIEM_QUATRINH',
        'TYTRONG_DIEM_HOIDONG',
        'TYTRONG_DIEM_PHANBIEN',
        'ID_NGUOIPHEDUYET',
        'SETTINGS',
        'TYLE_TAISUDUNG_TOIDA',
    ];

    protected $casts = [
        'NGAY_BATDAU' => 'datetime',
        'NGAY_KETHUC' => 'datetime',
        'NGAYTAO' => 'datetime',
        'NGAYCAPNHAT' => 'datetime',
        'SETTINGS' => 'array',
    ];

    public function mocThoigians()
    {
        return $this->hasMany(MocThoigian::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }

    public function sinhvienThamgias()
    {
        return $this->hasMany(SinhvienThamgia::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }

    public function nguoiTao()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOITAO', 'ID_NGUOIDUNG');
    }

    public function nguoiPheDuyet()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOIPHEDUYET', 'ID_NGUOIDUNG');
    }

    public function nhoms()
    {
        return $this->hasMany(Nhom::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }

    public function hoidongs()
    {
        return $this->hasMany(Hoidong::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }

    public function isFeatureActive(string $featureKey): bool
    {
        // SỬA LỖI: Đảm bảo $this->SETTINGS là mảng trước khi truy cập key
        // Nếu SETTINGS là null, gán nó là mảng rỗng []
        $settings = $this->SETTINGS ?? [];
        
        $featureConfig = $settings[$featureKey] ?? null;

        // Nếu không có cấu hình -> Mặc định là TẮT
        if (!$featureConfig) {
            return false; 
        }

        // 1. Kiểm tra cờ tắt thủ công (Ưu tiên cao nhất)
        if (isset($featureConfig['manual_override'])) {
            if ($featureConfig['manual_override'] === 'DISABLED') {
                return false; // Bắt buộc tắt
            }
            if ($featureConfig['manual_override'] === 'ENABLED') {
                return true; // Bắt buộc mở (bỏ qua ngày tháng)
            }
        }

        // 2. Nếu không có override (hoặc là AUTO/null), kiểm tra ngày tháng
        try {
            $start = !empty($featureConfig['start']) ? Carbon::parse($featureConfig['start']) : null;
            $end = !empty($featureConfig['end']) ? Carbon::parse($featureConfig['end']) : null;
        } catch (\Exception $e) {
            return false; // Lỗi format ngày -> Tắt
        }

        // Nếu thiếu ngày -> Tắt
        if (!$start || !$end) {
            return false; 
        }

        // Kiểm tra thời gian thực tế
        return now()->isBetween($start, $end);
    }
}