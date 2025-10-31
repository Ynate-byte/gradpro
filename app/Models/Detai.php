<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Detai extends Model
{
    use HasFactory;

    protected $table = 'DETAI';
    protected $primaryKey = 'ID_DETAI';
    public $timestamps = false;

    protected $fillable = [
        'ID_KEHOACH',
        'MA_DETAI',
        'TEN_DETAI',
        'MOTA',
        'ID_CHUYENNGANH',
        'YEUCAU',
        'MUCTIEU',
        'KETQUA_MONGDOI',
        'ID_NGUOI_DEXUAT',
        'SO_NHOM_TOIDA',
        'SO_NHOM_HIENTAI',
        'TRANGTHAI',
        'ID_NGUOI_DUYET',
        'NGAY_DUYET',
        'LYDO_TUCHOI',
        'NGAYTAO',
        'NGAYCAPNHAT',
    ];

    protected $casts = [
        'NGAY_DUYET' => 'datetime',
        'NGAYTAO' => 'datetime',
        'NGAYCAPNHAT' => 'datetime',
        'SO_NHOM_TOIDA' => 'integer',
        'SO_NHOM_HIENTAI' => 'integer',
    ];

    // Relationships
    public function kehoachKhoaluan(): BelongsTo
    {
        return $this->belongsTo(KehoachKhoaluan::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }
     public function nguoidung(): BelongsTo
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }


    public function chuyennganh(): BelongsTo
    {
        return $this->belongsTo(Chuyennganh::class, 'ID_CHUYENNGANH', 'ID_CHUYENNGANH');
    }

    public function nguoiDexuat(): BelongsTo
    {
        return $this->belongsTo(Giangvien::class, 'ID_NGUOI_DEXUAT', 'ID_GIANGVIEN');
    }

    public function nguoiDuyet(): BelongsTo
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOI_DUYET', 'ID_NGUOIDUNG');
    }

    public function phancongDetaiNhom(): HasMany
    {
        return $this->hasMany(PhancongDetaiNhom::class, 'ID_DETAI', 'ID_DETAI');
    }

    public function goiyDetai(): HasMany
    {
        return $this->hasMany(GoiyDetai::class, 'ID_DETAI', 'ID_DETAI');
    }

    // Scopes
    public function scopeApproved($query)
    {
        return $query->where('TRANGTHAI', 'Đã duyệt');
    }

    public function scopeByLecturer($query, $lecturerId)
    {
        return $query->where('ID_NGUOI_DEXUAT', $lecturerId);
    }

    public function scopeAvailableForRegistration($query)
    {
        return $query->where('TRANGTHAI', 'Đã duyệt')
                    ->whereRaw('SO_NHOM_HIENTAI < SO_NHOM_TOIDA');
    }

    // Methods
    public function isAvailableForRegistration()
    {
        return $this->TRANGTHAI === 'Đã duyệt' &&
               $this->SO_NHOM_HIENTAI < $this->SO_NHOM_TOIDA;
    }
}