<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MocThoigian extends Model
{
    use HasFactory;

    protected $table = 'MOC_THOIGIAN';
    protected $primaryKey = 'ID';

    protected $fillable = [
        'ID_KEHOACH',
        'TEN_SUKIEN',
        'NGAY_BATDAU',
        'NGAY_KETTHUC',
        'MOTA',
    ];

    public function kehoach()
    {
        return $this->belongsTo(KehoachKhoaluan::class, 'ID_KEHOACH', 'ID_KEHOACH');
    }
}