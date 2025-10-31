<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class NewsImage extends Model
{
    use HasFactory;

    // Tên bảng rõ ràng
    protected $table = 'news_images';

    // Các trường có thể gán hàng loạt
    protected $fillable = [
        'news_id',
        'filename',
    ];

    /**
     * Quan hệ với News
     * Mỗi ảnh thuộc về một bài News
     */
    public function news()
    {
        return $this->belongsTo(News::class, 'news_id', 'id');
    }

    /**
     * Accessor: lấy URL đầy đủ của ảnh
     */
    public function getUrlAttribute()
    {
        return asset('storage/news/images/' . $this->filename);
    }
}
