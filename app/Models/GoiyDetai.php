<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany; // Thêm HasMany

class GoiyDetai extends Model
{
    use HasFactory;

    protected $table = 'GOIY_DETAI';
    protected $primaryKey = 'ID_GOIY';
    public $timestamps = false;

    protected $fillable = [
        'ID_DETAI',
        'ID_NGUOI_GOIY',
        'ID_GIANGVIEN',
        'NOIDUNG_GOIY',
        'NGAYTAO',
        // 'PHAN_HOI',      <-- XÓA DÒNG NÀY
        // 'NGAY_PHAN_HOI', <-- XÓA DÒNG NÀY
    ];

    protected $casts = [
        'NGAYTAO' => 'datetime',
        // 'NGAY_PHAN_HOI' => 'datetime', <-- XÓA DÒNG NÀY
    ];

    // Relationships
    public function detai(): BelongsTo
    {
        return $this->belongsTo(Detai::class, 'ID_DETAI', 'ID_DETAI');
    }

    public function nguoiGoiy(): BelongsTo
    {
        return $this->belongsTo(Giangvien::class, 'ID_NGUOI_GOIY', 'ID_GIANGVIEN');
    }

    public function giangvien(): BelongsTo
    {
        return $this->belongsTo(Giangvien::class, 'ID_GIANGVIEN', 'ID_GIANGVIEN');
    }

    /**
     * [MỚI] Một góp ý có nhiều phản hồi.
     */
    public function phanhois(): HasMany
    {
        // Sắp xếp các phản hồi mới nhất lên trước
        return $this->hasMany(PhanhoiGoiy::class, 'ID_GOIY', 'ID_GOIY')->orderBy('created_at', 'asc');
    }
}