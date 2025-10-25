<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MauMocThoigian extends Model
{
    use HasFactory;

    protected $table = 'MAU_MOC_THOIGIAN';
    protected $primaryKey = 'ID_MAU_MOC';
    public $timestamps = false;

    protected $fillable = [
        'ID_MAU',
        'TEN_SUKIEN',
        'MOTA',
        'OFFSET_BATDAU',
        'THOI_LUONG',
        'THU_TU',
        'VAITRO_THUCHIEN_MACDINH',
    ];

    public function mauKehoach(): BelongsTo
    {
        return $this->belongsTo(MauKehoach::class, 'ID_MAU', 'ID_MAU');
    }
}