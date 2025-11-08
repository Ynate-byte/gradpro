<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class FileNopSanpham extends Model
{
    use HasFactory;
    protected $table = 'FILE_NOP_SANPHAM';
    protected $primaryKey = 'ID_FILE';
    public $timestamps = false; // Không dùng timestamps

    protected $fillable = [
        'ID_NOP_SANPHAM',
        'LOAI_FILE',
        'DUONG_DAN_HOAC_NOI_DUNG',
        'TEN_FILE_GOC',
        'KICH_THUOC_FILE',
    ];

    protected $appends = ['url']; // Thêm accessor URL

    // File này thuộc về phiếu nộp nào
    public function nopSanpham(): BelongsTo
    {
        return $this->belongsTo(NopSanpham::class, 'ID_NOP_SANPHAM', 'ID_NOP_SANPHAM');
    }

    // Accessor để lấy URL đầy đủ
    public function getUrlAttribute(): ?string
    {
        // Nếu là link, trả về chính nó
        if (in_array($this->LOAI_FILE, ['LinkDemo', 'LinkRepository'])) {
            return $this->DUONG_DAN_HOAC_NOI_DUNG;
        }

        // Nếu là file, trả về URL từ storage
        if ($this->DUONG_DAN_HOAC_NOI_DUNG && Storage::disk('public')->exists($this->DUONG_DAN_HOAC_NOI_DUNG)) {
            return Storage::disk('public')->url($this->DUONG_DAN_HOAC_NOI_DUNG);
        }

        return null;
    }
}
