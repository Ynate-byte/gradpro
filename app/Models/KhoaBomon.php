<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KhoaBomon extends Model
{
    use HasFactory;
    
    protected $table = 'KHOA_BOMON';
    protected $primaryKey = 'ID_KHOA_BOMON';
    public $timestamps = false;
    const CREATED_AT = 'NGAYTAO';

    protected $fillable = [
        'MA_KHOA_BOMON',
        'TEN_KHOA_BOMON',
        'MOTA',
        'TRANGTHAI_KICHHOAT',
    ];

    public function giangvien()
    {
        return $this->hasMany(Giangvien::class, 'ID_KHOA_BOMON', 'ID_KHOA_BOMON');
    }

    public function nhoms()
    {
        return $this->hasMany(Nhom::class, 'ID_KHOA_BOMON', 'ID_KHOA_BOMON');
    }
}