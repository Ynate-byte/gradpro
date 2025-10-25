<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage; // Thêm use Storage

class News extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'news';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'title',
        'content',
        'pdf_file',
        'cover_image',
        'category',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    // Các trường được tính toán và nối vào JSON/Array
    protected $appends = [
        'pdf_url',
        'cover_image_url',
        'images_urls',
        // Không cần append tên người tạo/cập nhật vì đã load qua relationship
        // 'created_by_name',
        // 'updated_by_name',
    ];

    /* ===========================================================
     |                   QUAN HỆ (RELATIONSHIPS)
     =========================================================== */

    /**
     * 🔹 Người tạo tin
     */
    public function nguoiTao()
    {
        // Đảm bảo select cả ID_VAITRO để có thể load relationship 'vaitro'
        return $this->belongsTo(Nguoidung::class, 'created_by', 'ID_NGUOIDUNG')
            ->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO');
    }

    /**
     * 🔹 Người cập nhật tin
     */
    public function nguoiCapNhat()
    {
        // Đảm bảo select cả ID_VAITRO
        return $this->belongsTo(Nguoidung::class, 'updated_by', 'ID_NGUOIDUNG')
            ->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO');
    }

    /**
     * 🔹 Người xóa tin
     */
    public function nguoiXoa()
    {
        return $this->belongsTo(Nguoidung::class, 'deleted_by', 'ID_NGUOIDUNG')
            ->select('ID_NGUOIDUNG', 'HODEM_VA_TEN');
    }

    /**
     * 🔹 Danh sách ảnh phụ
     */
    public function images()
    {
        return $this->hasMany(NewsImage::class, 'news_id', 'id');
    }

    /* ===========================================================
     |                   ACCESSORS (GETTERS)
     =========================================================== */

    /**
     * ✅ URL đầy đủ của file PDF
     */
    public function getPdfUrlAttribute(): ?string
    {
        // Trả về URL đầy đủ nếu pdf_file tồn tại và file thực sự có trên disk 'public'
        return ($this->pdf_file && Storage::disk('public')->exists($this->pdf_file))
            ? Storage::disk('public')->url($this->pdf_file)
            : null;
    }

    /**
     * ✅ URL đầy đủ của ảnh bìa
     */
    public function getCoverImageUrlAttribute(): ?string
    {
        // Trả về URL đầy đủ nếu cover_image tồn tại và file thực sự có trên disk 'public'
        return ($this->cover_image && Storage::disk('public')->exists($this->cover_image))
            ? Storage::disk('public')->url($this->cover_image)
            : null;
    }

    /**
     * ✅ Mảng URL đầy đủ của danh sách ảnh liên quan
     */
    public function getImagesUrlsAttribute(): array
    {
        // Load relationship 'images' nếu chưa có để đảm bảo $this->images tồn tại
        $this->loadMissing('images');

        // Map qua collection 'images' (nếu có) và tạo URL đầy đủ cho mỗi ảnh
        return $this->images
            ? $this->images->map(function($img) {
                // Chỉ trả về URL nếu file tồn tại
                return ($img->filename && Storage::disk('public')->exists($img->filename))
                    ? Storage::disk('public')->url($img->filename)
                    : null;
            })->filter()->values()->toArray() // Lọc bỏ các giá trị null và reset keys
            : [];
    }
}