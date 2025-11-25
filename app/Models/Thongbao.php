<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Thongbao extends Model
{
    use HasFactory;

    protected $table = 'THONGBAO';
    protected $primaryKey = 'ID_THONGBAO';
    public $timestamps = false;

    protected $fillable = [
        'ID_NGUOINHAN',
        'TIEU_DE',
        'NOI_DUNG',
        'LOAI_THONGBAO',
        'DO_UU_TIEN',
        'LIEN_KET',
        'DU_LIEU_GOC',
        'DA_DOC',
        'NGAY_TAO'
    ];

    protected $casts = [
        'DA_DOC' => 'boolean',
        'DU_LIEU_GOC' => 'array',
        'NGAY_TAO' => 'datetime',
    ];

    public function nguoiNhan()
    {
        return $this->belongsTo(Nguoidung::class, 'ID_NGUOINHAN', 'ID_NGUOIDUNG');
    }
}