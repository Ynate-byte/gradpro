<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MauKehoach extends Model
{
    use HasFactory;

    protected $table = 'MAU_KEHOACH';
    protected $primaryKey = 'ID_MAU';

    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = 'NGAYCAPNHAT';

    protected $fillable = [
        'TEN_MAU',
        'HEDAOTAO_MACDINH',
        'SO_TUAN_MACDINH',
        'MO_TA',
    ];

    public function mauMocThoigians(): HasMany
    {
        return $this->hasMany(MauMocThoigian::class, 'ID_MAU', 'ID_MAU')->orderBy('THU_TU');
    }
}