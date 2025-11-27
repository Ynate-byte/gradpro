<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Chuyennganh extends Model
{
    use HasFactory;

    protected $table = 'CHUYENNGANH';
    protected $primaryKey = 'ID_CHUYENNGANH';
    public $timestamps = false;
    const CREATED_AT = 'NGAYTAO';

    protected $fillable = [
        'MA_CHUYENNGANH',
        'TEN_CHUYENNGANH',
        'MOTA',
        'TRANGTHAI_KICHHOAT',
    ];
    public function hoidongs()
    {
        return $this->hasMany(Hoidong::class, 'ID_CHUYENNGANH', 'ID_CHUYENNGANH');
    }
    public function khoabomon(): BelongsTo
    {
        return $this->belongsTo(KhoaBomon::class, 'ID_KHOA_BOMON', 'ID_KHOA_BOMON');
    }
}