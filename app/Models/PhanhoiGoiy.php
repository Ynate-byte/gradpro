<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhanhoiGoiy extends Model
{
    use HasFactory;

    protected $table = 'PHANHOI_GOIY';
    protected $primaryKey = 'ID_PHANHOI';
    
    // Sử dụng timestamps (created_at, updated_at)
    public $timestamps = true; 

    protected $fillable = [
        'ID_GOIY',
        'ID_GIANGVIEN',
        'NOIDUNG',
    ];

    /**
     * Phản hồi này thuộc về góp ý nào.
     */
    public function goiyDetai(): BelongsTo
    {
        return $this->belongsTo(GoiyDetai::class, 'ID_GOIY', 'ID_GOIY');
    }

    /**
     * Giảng viên nào đã phản hồi.
     */
    public function giangvien(): BelongsTo
    {
        return $this->belongsTo(Giangvien::class, 'ID_GIANGVIEN', 'ID_GIANGVIEN');
    }
}