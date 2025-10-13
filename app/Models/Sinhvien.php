<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sinhvien extends Model
{
    use HasFactory;

    protected $table = 'SINHVIEN';
    protected $primaryKey = 'ID_SINHVIEN';
    public $timestamps = false;

    protected $fillable = [
        'ID_NGUOIDUNG',
        'ID_CHUYENNGANH',
        'TEN_LOP',
        'NIENKHOA',
        'HEDAOTAO',
    ];

    public function nguoidung()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOIDUNG', 'ID_NGUOIDUNG');
    }

    public function chuyennganh()
    {
        return $this->belongsTo(Chuyennganh::class, 'ID_CHUYENNGANH', 'ID_CHUYENNGANH');
    }
}