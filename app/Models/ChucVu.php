<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChucVu extends Model
{
    use HasFactory;

    protected $table = 'CHUCVU';
    protected $primaryKey = 'ID_CHUCVU';
    public $timestamps = false;
    const CREATED_AT = 'NGAYTAO';

    protected $fillable = [
        'MA_CHUCVU',
        'TEN_CHUCVU',
        'MOTA',
    ];

    public function giangviens()
    {
        return $this->belongsToMany(Giangvien::class, 'GIANGVIEN_CHUCVU', 'ID_CHUCVU', 'ID_GIANGVIEN');
    }
}