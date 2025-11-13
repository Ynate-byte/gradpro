<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CotCongViec extends Model
{
    use HasFactory;
    protected $table = 'COT_CONGVIEC';
    protected $primaryKey = 'ID_COT';
    const CREATED_AT = 'NGAYTAO';
    const UPDATED_AT = null; // Không có cột NGAYCAPNHAT

    protected $fillable = ['TEN_COT', 'THUTU_HIENTHI'];

    /**
     * Lấy tất cả công việc thuộc cột này.
     */
    public function congViecs(): HasMany
    {
        return $this->hasMany(CongViec::class, 'ID_COT', 'ID_COT');
    }
}