<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\News;
use App\Models\NewsImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Services\NotificationService;

class NewsController extends Controller
{
    /**
     * Helper: Kiểm tra quyền Quản lý Tin tức (Admin, Trưởng khoa, Giáo vụ)
     * Sử dụng các hàm helper có sẵn trong Controller cha
     */
    private function canManageNews(): bool
    {
        if (!Auth::check()) {
            return false;
        }
        return $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();
    }

    /**
     * Helper: Format dữ liệu trả về chuẩn JSON cho Frontend
     */
    private function formatNewsData(News $news)
    {
        // Eager load nếu chưa có
        $news->loadMissing(['nguoiTao.vaitro', 'nguoiCapNhat.vaitro', 'images']);

        return [
            'id' => $news->id,
            'title' => $news->title,
            'content' => $news->content,
            'category' => $news->category ?? 'Chưa phân loại',
            
            // Các trường mới
            'is_pinned' => (bool)$news->is_pinned,
            'target_roles' => $news->target_roles, // Laravel tự cast sang Array nhờ Model

            'pdf_url' => $news->pdf_url,
            'cover_image_url' => $news->cover_image_url,
            // Giả sử Model News có accessor images_urls hoặc lấy từ relation images
            'images' => $news->images->map(fn($img) => Storage::url($img->filename)), 
            
            'created_at' => $news->created_at,
            'updated_at' => $news->updated_at,
            
            'nguoi_tao' => $news->nguoiTao ? [
                'ten' => $news->nguoiTao->HODEM_VA_TEN,
                'email' => $news->nguoiTao->EMAIL,
                'vaitro' => $news->nguoiTao->vaitro?->TEN_VAITRO ?? 'Không rõ',
            ] : ['ten' => 'Ban Quản trị', 'vaitro' => 'Admin'],
            
            'nguoi_cap_nhat' => $news->nguoiCapNhat ? [
                'ten' => $news->nguoiCapNhat->HODEM_VA_TEN,
            ] : null,
        ];
    }

    /* ===========================================================
     | ✅ LẤY DANH SÁCH TIN TỨC (INDEX)
     =========================================================== */
    public function index(Request $request)
    {
        try {
            $query = News::with([
                'nguoiTao' => function ($query) {
                    $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO', 'EMAIL')
                          ->with('vaitro:ID_VAITRO,TEN_VAITRO');
                },
                'images'
            ]);

            // 1. LỌC THEO ĐỐI TƯỢNG XEM (Nếu không phải Quản lý)
            if (!$this->canManageNews()) {
                $user = Auth::user();
                // Lấy tên vai trò từ quan hệ
                $roleName = $user->vaitro->TEN_VAITRO ?? '';
                
                // Mapping tên vai trò sang mã code lưu trong JSON
                $targetCode = ($roleName === 'Sinh viên') ? 'SINH_VIEN' : 'GIANG_VIEN';

                $query->where(function($q) use ($targetCode) {
                    $q->whereJsonContains('target_roles', 'ALL')       // Cho tất cả
                      ->orWhereJsonContains('target_roles', $targetCode) // Cho vai trò cụ thể
                      ->orWhereNull('target_roles');                   // Tin cũ (mặc định hiện)
                });
            }

            // 2. SẮP XẾP: Ghim lên đầu -> Mới nhất
            $query->orderByDesc('is_pinned')->orderByDesc('created_at');

            // 3. PHÂN TRANG
            $paginated = $query->paginate(10);

            // Map dữ liệu qua helper format
            $data = $paginated->getCollection()->map(fn($item) => $this->formatNewsData($item));

            return response()->json([
                'current_page' => $paginated->currentPage(),
                'data' => $data,
                'total' => $paginated->total(),
                'last_page' => $paginated->lastPage(),
            ]);

        } catch (\Throwable $e) {
            Log::error('News.index Error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Lỗi tải danh sách tin tức.'], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            if (!$this->canManageNews()) {
                return response()->json(['error' => 'Bạn không có quyền thêm tin tức.'], 403);
            }

            // Validate dữ liệu
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'category' => 'required|string|max:100',
                'content' => 'required|string',
                'is_pinned' => 'nullable', // Chấp nhận "1", "true", 1, true
                'target_roles' => 'nullable', // JSON string từ FormData
                'pdf_file' => 'nullable|file|mimes:pdf|max:20480', // Max 20MB
                'cover_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120', // Max 5MB
                'images.*' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            ], [
                'title.required' => 'Vui lòng nhập tiêu đề.',
                'content.required' => 'Vui lòng nhập nội dung.',
                'category.required' => 'Vui lòng chọn phân loại.',
            ]);

            // Chuẩn bị dữ liệu để lưu
            $data = [
                'title' => $validated['title'],
                'category' => $validated['category'],
                'content' => $validated['content'],
                'created_by' => Auth::id(),
                'is_pinned' => filter_var($request->is_pinned, FILTER_VALIDATE_BOOLEAN),
            ];

            // Xử lý target_roles (Decode JSON từ Frontend)
            if ($request->filled('target_roles')) {
                $roles = json_decode($request->target_roles, true);
                $data['target_roles'] = is_array($roles) ? $roles : ['ALL'];
            } else {
                $data['target_roles'] = ['ALL'];
            }

            // Xử lý file PDF
            if ($request->hasFile('pdf_file')) {
                $path = $request->file('pdf_file')->store('news/pdfs', 'public');
                $data['pdf_url'] = Storage::url($path);
            }

            // Xử lý ảnh bìa
            if ($request->hasFile('cover_image')) {
                $path = $request->file('cover_image')->store('news/covers', 'public');
                $data['cover_image_url'] = Storage::url($path);
            }

            // Tạo bản ghi News
            $news = News::create($data);

            // Xử lý ảnh phụ (Content Images)
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    $path = $image->store('news/images', 'public');
                    NewsImage::create([
                        'news_id' => $news->id,
                        'filename' => $path // Lưu đường dẫn relative (news/images/xxx.jpg)
                    ]);
                }
            }

            $targetRoles = $news->target_roles ?? ['ALL'];
            $query = \App\Models\Nguoidung::where('TRANGTHAI_KICHHOAT', true);

            if (!in_array('ALL', $targetRoles)) {
                $query->whereHas('vaitro', function($q) use ($targetRoles) {
                    $roles = [];
                    if (in_array('SINH_VIEN', $targetRoles)) $roles[] = 'Sinh viên';
                    if (in_array('GIANG_VIEN', $targetRoles)) $roles[] = 'Giảng viên';
                    $q->whereIn('TEN_VAITRO', $roles);
                });
            }

            // Chunk để gửi
            $query->chunk(100, function($users) use ($news) {
                foreach ($users as $user) {
                    NotificationService::send(
                        $user->ID_NGUOIDUNG,
                        "Tin tức mới: " . \Illuminate\Support\Str::limit($news->title, 50),
                        "Đã có thông báo mới trong mục Tin tức.",
                        'SYSTEM',
                        '/news/' . $news->id,
                        ['news_id' => $news->id]
                    );
                }
            });

            return response()->json([
                'message' => 'Đăng tin tức thành công!',
                'data' => $this->formatNewsData($news),
            ], 201);

        } catch (ValidationException $e) {
             return response()->json(['message' => 'Dữ liệu không hợp lệ.', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('News.store Error', ['msg' => $e->getMessage()]);
            return response()->json(['error' => 'Lỗi máy chủ khi tạo tin tức.'], 500);
        }
    }

    /* ===========================================================
     | ✅ XEM CHI TIẾT (SHOW)
     =========================================================== */
    public function show($id)
    {
        try {
            $news = News::with(['nguoiTao', 'images'])->findOrFail($id);
            return response()->json($this->formatNewsData($news));
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Không tìm thấy tin tức.'], 404);
        }
    }

    /* ===========================================================
     | ✅ CẬP NHẬT TIN TỨC (UPDATE)
     =========================================================== */
    public function update(Request $request, $id)
    {
        try {
            if (!$this->canManageNews()) {
                return response()->json(['error' => 'Bạn không có quyền sửa tin tức.'], 403);
            }

            $news = News::findOrFail($id);

            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255',
                'category' => 'sometimes|required|string',
                'content' => 'sometimes|required|string',
                'is_pinned' => 'nullable',
                'target_roles' => 'nullable',
                // Các cờ xóa file
                'remove_pdf' => 'nullable',
                'remove_cover_image' => 'nullable',
                'deleted_images' => 'nullable|array',
            ]);

            // Cập nhật thông tin cơ bản
            $news->fill(collect($validated)->only(['title', 'category', 'content'])->all());
            $news->updated_by = Auth::id();

            if ($request->has('is_pinned')) {
                $news->is_pinned = filter_var($request->is_pinned, FILTER_VALIDATE_BOOLEAN);
            }

            if ($request->has('target_roles')) {
                $roles = json_decode($request->target_roles, true);
                $news->target_roles = is_array($roles) ? $roles : ['ALL'];
            }

            // Xử lý PDF (Thay thế hoặc Xóa)
            if ($request->hasFile('pdf_file')) {
                // Xóa file cũ
                if ($news->pdf_url) {
                    $oldPath = str_replace('/storage/', '', $news->pdf_url);
                    Storage::disk('public')->delete($oldPath);
                }
                // Lưu file mới
                $path = $request->file('pdf_file')->store('news/pdfs', 'public');
                $news->pdf_url = Storage::url($path);
            } elseif ($request->boolean('remove_pdf')) {
                if ($news->pdf_url) {
                    $oldPath = str_replace('/storage/', '', $news->pdf_url);
                    Storage::disk('public')->delete($oldPath);
                }
                $news->pdf_url = null;
            }

            // Xử lý Ảnh bìa (Thay thế hoặc Xóa)
            if ($request->hasFile('cover_image')) {
                if ($news->cover_image_url) {
                    $oldPath = str_replace('/storage/', '', $news->cover_image_url);
                    Storage::disk('public')->delete($oldPath);
                }
                $path = $request->file('cover_image')->store('news/covers', 'public');
                $news->cover_image_url = Storage::url($path);
            } elseif ($request->boolean('remove_cover_image')) {
                if ($news->cover_image_url) {
                    $oldPath = str_replace('/storage/', '', $news->cover_image_url);
                    Storage::disk('public')->delete($oldPath);
                }
                $news->cover_image_url = null;
            }

            $news->save();

            // Xử lý xóa ảnh phụ (deleted_images gửi lên là mảng path hoặc url)
            if ($request->filled('deleted_images')) {
                foreach ($request->deleted_images as $delPath) {
                    // Frontend gửi path relative (news/images/xxx.jpg) hoặc full URL
                    // Ta cần clean để lấy path trong storage
                    $cleanPath = str_replace(Storage::url(''), '', $delPath);
                    
                    // Tìm trong DB
                    $imgRecord = NewsImage::where('news_id', $news->id)->where('filename', $cleanPath)->first();
                    if ($imgRecord) {
                        Storage::disk('public')->delete($imgRecord->filename);
                        $imgRecord->delete();
                    }
                }
            }

            // Thêm ảnh phụ mới
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    $path = $image->store('news/images', 'public');
                    NewsImage::create([
                        'news_id' => $news->id,
                        'filename' => $path
                    ]);
                }
            }

            return response()->json([
                'message' => 'Cập nhật tin tức thành công!',
                'data' => $this->formatNewsData($news),
            ]);

        } catch (ValidationException $e) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ.', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('News.update Error', ['id' => $id, 'msg' => $e->getMessage()]);
            return response()->json(['error' => 'Lỗi cập nhật tin tức.'], 500);
        }
    }

    /* ===========================================================
     | ✅ XÓA TIN TỨC (DESTROY)
     =========================================================== */
    public function destroy($id)
    {
        try {
            if (!$this->canManageNews()) {
                return response()->json(['error' => 'Bạn không có quyền xóa tin tức.'], 403);
            }

            $news = News::findOrFail($id);

            // Xóa file PDF
            if ($news->pdf_url) {
                $path = str_replace('/storage/', '', $news->pdf_url);
                Storage::disk('public')->delete($path);
            }

            // Xóa file Cover
            if ($news->cover_image_url) {
                $path = str_replace('/storage/', '', $news->cover_image_url);
                Storage::disk('public')->delete($path);
            }

            // Xóa ảnh phụ
            foreach ($news->images as $img) {
                Storage::disk('public')->delete($img->filename);
                $img->delete();
            }

            $news->delete();

            return response()->json(['message' => 'Đã xóa tin tức.']);

        } catch (\Throwable $e) {
            Log::error('News.destroy Error', ['id' => $id, 'msg' => $e->getMessage()]);
            return response()->json(['error' => 'Lỗi xóa tin tức.'], 500);
        }
    }

    /* ===========================================================
     | ✅ TẢI FILE PDF (DOWNLOAD)
     =========================================================== */
    public function downloadPdf($id)
    {
        try {
            $news = News::findOrFail($id);
            
            if (!$news->pdf_url) {
                return response()->json(['message' => 'Không có file PDF'], 404);
            }
            
            // Chuyển URL public (/storage/...) thành đường dẫn relative trong storage/app/public
            $relativePath = str_replace('/storage/', '', parse_url($news->pdf_url, PHP_URL_PATH));
            // Loại bỏ dấu / ở đầu nếu có
            $relativePath = ltrim($relativePath, '/');

            if (Storage::disk('public')->exists($relativePath)) {
                return Storage::disk('public')->download($relativePath);
            }
            
            return response()->json(['message' => 'File không tồn tại trên hệ thống.'], 404);

        } catch (\Throwable $e) {
            return response()->json(['error' => 'Lỗi tải file.'], 500);
        }
    }
}