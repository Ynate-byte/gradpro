<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhancongDetaiNhom extends Model
{
    use HasFactory;

    protected $table = 'PHANCONG_DETAI_NHOM';
    protected $primaryKey = 'ID_PHANCONG';
    public $timestamps = false;

    protected $fillable = [
        'ID_NHOM',
        'ID_DETAI',
        'ID_GVHD',
        'NGAY_PHANCONG',
        'TRANGTHAI',
    ];

    protected $casts = [
        'NGAY_PHANCONG' => 'datetime',
    ];

    // Relationships
    public function nhom(): BelongsTo
    {
        return $this->belongsTo(Nhom::class, 'ID_NHOM', 'ID_NHOM');
    }

    public function detai(): BelongsTo
    {
        return $this->belongsTo(Detai::class, 'ID_DETAI', 'ID_DETAI');
    }

    public function gvhd(): BelongsTo
    {
        return $this->belongsTo(Giangvien::class, 'ID_GVHD', 'ID_GIANGVIEN');
    }
}
