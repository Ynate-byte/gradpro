<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    public function giangviens()
    {
        // Giả định giảng viên cũng có ID_CHUYENNGANH (nếu không, quan hệ này sẽ không hoạt động)
        return $this->hasMany(Giangvien::class, 'ID_CHUYENNGANH', 'ID_CHUYENNGANH');
    }

    public function hoidongs()
    {
        return $this->hasMany(Hoidong::class, 'ID_CHUYENNGANH', 'ID_CHUYENNGANH');
    }
}