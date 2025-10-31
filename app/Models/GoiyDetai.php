<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoiyDetai extends Model
{
    use HasFactory;

    protected $table = 'GOIY_DETAI';
    protected $primaryKey = 'ID_GOIY';
    public $timestamps = false;

    protected $fillable = [
        'ID_DETAI',
        'ID_NGUOI_GOIY',
        'NOIDUNG_GOIY',
        'NGAYTAO',
    ];

    protected $casts = [
        'NGAYTAO' => 'datetime',
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
}