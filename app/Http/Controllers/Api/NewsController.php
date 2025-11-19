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

class NewsController extends Controller
{
    /**
     * 🔹 Sửa đổi: Kiểm tra quyền Quản lý Tin tức (Admin, Trưởng khoa, Giáo vụ)
     */
    private function canManageNews(): bool
    {
        if (!Auth::check()) {
            return false;
        }

        // [CẬP NHẬT] Sử dụng các hàm helper từ Base Controller
        // Các hàm này đã được cập nhật để kiểm tra bảng quan hệ GIANGVIEN_CHUCVU
        return $this->isAdmin() || $this->isTruongKhoa() || $this->isGiaoVu();
    }

    /* ===========================================================
     | ✅ LẤY DANH SÁCH TIN TỨC
     =========================================================== */
    public function index()
    {
        try {
            // Đảm bảo load đúng relationship 'vaitro'
            $newsList = News::with([
                // Chọn cụ thể các cột cần thiết từ nguoiTao và vaitro liên quan
                'nguoiTao' => function ($query) {
                    $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO')
                          ->with('vaitro:ID_VAITRO,TEN_VAITRO');
                },
                // Tương tự cho nguoiCapNhat
                'nguoiCapNhat' => function ($query) {
                    $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO')
                          ->with('vaitro:ID_VAITRO,TEN_VAITRO');
                },
                'images' // Load danh sách ảnh phụ
            ])
            ->orderByDesc('created_at') // Sắp xếp tin mới nhất lên đầu
            ->get();

            // Map dữ liệu trả về client
            $data = $newsList->map(fn($item) => [
                'id' => $item->id,
                'title' => $item->title,
                'content' => $item->content,
                'category' => $item->category ?? 'Chưa phân loại',
                'pdf_url' => $item->pdf_url, // Accessor từ model News
                'cover_image_url' => $item->cover_image_url, // Accessor từ model News
                'images' => $item->images_urls, // Accessor từ model News
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
                'nguoi_tao' => [
                    'ten' => $item->nguoiTao?->HODEM_VA_TEN ?? 'Không xác định',
                    'vaitro' => $item->nguoiTao?->vaitro?->TEN_VAITRO ?? 'Không rõ',
                ],
                'nguoi_cap_nhat' => $item->nguoiCapNhat ? [
                    'ten' => $item->nguoiCapNhat->HODEM_VA_TEN,
                    'vaitro' => $item->nguoiCapNhat->vaitro?->TEN_VAITRO ?? 'Không rõ',
                ] : null,
            ]);

            return response()->json([
                'total' => $data->count(),
                'data' => $data,
            ]);

        } catch (\Throwable $e) {
            // Ghi log lỗi chi tiết để dễ debug
            Log::error('News.index Error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Không thể tải danh sách tin tức. Vui lòng kiểm tra log server.'], 500);
        }
    }


    /* ===========================================================
     | ✅ THÊM TIN TỨC MỚI
     =========================================================== */
    public function store(Request $request)
    {
        try {
            // Kiểm tra quyền quản lý tin tức
            if (!$this->canManageNews()) {
                return response()->json(['error' => 'Bạn không có quyền thêm tin tức.'], 403);
            }

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'pdf_file' => 'nullable|file|mimes:pdf|max:20480', // 20MB
                'cover_image' => 'nullable|image|mimes:jpg,jpeg,png|max:5120', // 5MB
                'images.*' => 'nullable|image|mimes:jpg,jpeg,png|max:5120', // 5MB each
                'category' => 'nullable|string|max:100',
            ], [
                'title.required' => 'Tiêu đề không được để trống.',
                'content.required' => 'Nội dung không được để trống.',
            ]);

            $textData = collect($validated)->only(['title', 'content', 'category'])->all();

            $news = new News($textData);
            $news->created_by = Auth::id();

            if ($request->hasFile('pdf_file')) {
                $news->pdf_file = $request->file('pdf_file')->store('news/pdfs', 'public');
            }
            if ($request->hasFile('cover_image')) {
                $news->cover_image = $request->file('cover_image')->store('news/covers', 'public');
            }

            $news->save(); // Lưu news để lấy ID

            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    $filename = $image->store('news/images', 'public');
                    NewsImage::create(['news_id' => $news->id, 'filename' => $filename]);
                }
            }

            // Load lại các relationship cần thiết trước khi trả về
            $news->load(['nguoiTao.vaitro', 'images']);

            return response()->json([
                'message' => 'Thêm tin tức thành công!',
                'data' => $this->formatNewsData($news),
            ], 201);

        } catch (ValidationException $e) {
             Log::error('News.store Validation Error', ['errors' => $e->errors()]);
             return response()->json([
                 'message' => 'Dữ liệu không hợp lệ.',
                 'errors' => $e->errors()
             ], 422);
        } catch (\Throwable $e) {
            Log::error('News.store General Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Lỗi máy chủ khi tạo tin tức.'], 500);
        }
    }

    /* ===========================================================
     | ✅ XEM CHI TIẾT TIN TỨC
     =========================================================== */
    public function show($id)
    {
        try {
             $news = News::with([
                'nguoiTao' => function ($query) {
                    $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO')->with('vaitro:ID_VAITRO,TEN_VAITRO');
                },
                'nguoiCapNhat' => function ($query) {
                    $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO')->with('vaitro:ID_VAITRO,TEN_VAITRO');
                },
                'images'
            ])->findOrFail($id);

            return response()->json($this->formatNewsData($news));

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
             Log::warning('News.show Not Found', ['id' => $id]);
             return response()->json(['error' => 'Không tìm thấy tin tức.'], 404);
        } catch (\Throwable $e) {
            Log::error('News.show Error', ['id' => $id, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Lỗi khi xem chi tiết tin tức.'], 500);
        }
    }


    /* ===========================================================
     | ✅ CẬP NHẬT TIN TỨC
     =========================================================== */
    public function update(Request $request, $id)
    {
        try {
            // Kiểm tra quyền quản lý tin tức
            if (!$this->canManageNews()) {
                return response()->json(['error' => 'Bạn không có quyền chỉnh sửa tin tức.'], 403);
            }

            $news = News::findOrFail($id);

            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255',
                'content' => 'sometimes|required|string',
                'pdf_file' => 'nullable|file|mimes:pdf|max:20480',
                'cover_image' => 'nullable|image|mimes:jpg,jpeg,png|max:5120',
                'images.*' => 'nullable|image|mimes:jpg,jpeg,png|max:5120',
                'category' => 'nullable|string|max:100',
                'deleted_images' => 'nullable|array',
                'deleted_images.*' => 'string',
                'remove_pdf' => 'nullable|boolean',
                'remove_cover_image' => 'nullable|boolean',
            ]);

            // Cập nhật các trường text nếu có trong request
            $textData = collect($validated)->only(['title', 'content', 'category'])->all();
            if(!empty($textData)) {
                $news->fill($textData);
            }
            $news->updated_by = Auth::id();

            // Xử lý file PDF mới hoặc xóa file cũ
            if ($request->hasFile('pdf_file')) {
                Storage::disk('public')->delete($news->pdf_file ?? ''); // Xóa file cũ nếu có
                $news->pdf_file = $request->file('pdf_file')->store('news/pdfs', 'public');
            } elseif ($request->input('remove_pdf') == true) {
                Storage::disk('public')->delete($news->pdf_file ?? '');
                $news->pdf_file = null;
            }

            // Xử lý ảnh bìa mới hoặc xóa ảnh cũ
            if ($request->hasFile('cover_image')) {
                Storage::disk('public')->delete($news->cover_image ?? ''); // Xóa ảnh cũ nếu có
                $news->cover_image = $request->file('cover_image')->store('news/covers', 'public');
            } elseif ($request->input('remove_cover_image') == true) {
                Storage::disk('public')->delete($news->cover_image ?? '');
                $news->cover_image = null;
            }

            $news->save(); // Lưu các thay đổi vào DB

            // Xử lý xóa ảnh phụ
            if (!empty($validated['deleted_images'])) {
                $filenamesToDelete = $validated['deleted_images'];

                // Tìm các bản ghi NewsImage dựa trên filename
                $imagesToDeleteQuery = NewsImage::where('news_id', $news->id);

                $imagesToDeleteQuery->where(function ($query) use ($filenamesToDelete) {
                     foreach ($filenamesToDelete as $filename) {
                         $dbFilename = basename($filename); // Giả định filename là phần cuối của URL
                         $query->orWhere('filename', 'like', '%' . $dbFilename);
                     }
                 });

                 $imagesToDelete = $imagesToDeleteQuery->get();

                foreach ($imagesToDelete as $img) {
                    Storage::disk('public')->delete($img->filename); // Xóa file vật lý
                    $img->delete(); // Xóa bản ghi trong DB
                }
            }

            // Xử lý thêm ảnh phụ mới
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    $filename = $image->store('news/images', 'public');
                    NewsImage::create(['news_id' => $news->id, 'filename' => $filename]);
                }
            }

            // Load lại các relationship cần thiết trước khi trả về
            $news->load(['nguoiTao.vaitro', 'nguoiCapNhat.vaitro', 'images']);

            return response()->json([
                'message' => 'Cập nhật tin tức thành công!',
                'data' => $this->formatNewsData($news),
            ]);

        } catch (ValidationException $e) {
             Log::error('News.update Validation Error', ['id' => $id, 'errors' => $e->errors()]);
             return response()->json(['message' => 'Dữ liệu không hợp lệ.', 'errors' => $e->errors()], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('News.update Not Found', ['id' => $id]);
            return response()->json(['error' => 'Không tìm thấy tin tức để cập nhật.'], 404);
        } catch (\Throwable $e) {
            Log::error('News.update General Error', ['id' => $id, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Lỗi máy chủ khi cập nhật tin tức.'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            if (!$this->canManageNews()) {
                return response()->json(['error' => 'Bạn không có quyền xóa tin tức.'], 403);
            }

            $news = News::with('images')->findOrFail($id);

            Storage::disk('public')->delete($news->pdf_file ?? '');
            Storage::disk('public')->delete($news->cover_image ?? '');
            foreach ($news->images as $img) {
                Storage::disk('public')->delete($img->filename);
            }

            $news->deleted_by = Auth::id();
            $news->save();
            $news->delete();

            return response()->json(['message' => 'Đã xóa tin tức thành công!']);
       } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('News.destroy Not Found', ['id' => $id]);
            return response()->json(['error' => 'Không tìm thấy tin tức để xóa.'], 404);
        } catch (\Throwable $e) {
            Log::error('News.destroy Error', ['id' => $id, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Lỗi xóa tin tức.'], 500);
        }
    }

    public function pdf($id)
    {
        try {
            $news = News::findOrFail($id);

            // Kiểm tra file có tồn tại không
            if (!$news->pdf_file || !Storage::disk('public')->exists($news->pdf_file)) {
                 Log::warning('News.pdf File Not Found', ['id' => $id, 'pdf_file' => $news->pdf_file]);
                return response()->json(['error' => 'File PDF không tồn tại.'], 404);
            }

            // Trả về file PDF để hiển thị inline trong trình duyệt
            return response()->file(
                Storage::disk('public')->path($news->pdf_file),
                [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => 'inline; filename="' . basename($news->pdf_file) . '"',
                ]
            );
       } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('News.pdf News Not Found', ['id' => $id]);
            return response()->json(['error' => 'Tin tức không tồn tại.'], 404);
        } catch (\Throwable $e) {
            Log::error('News.pdf Error', ['id' => $id, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Không thể tải file PDF.'], 500);
        }
    }

    /**
     * Hàm helper để chuẩn hóa dữ liệu tin tức trả về API
     */
    private function formatNewsData(News $news)
    {
        $news->loadMissing(['nguoiTao.vaitro', 'nguoiCapNhat.vaitro', 'images']);

        return [
            'id' => $news->id,
            'title' => $news->title,
            'content' => $news->content,
            'category' => $news->category ?? 'Chưa phân loại',
            'pdf_url' => $news->pdf_url,
            'cover_image_url' => $news->cover_image_url,
            'images' => $news->images_urls,
            'created_at' => $news->created_at,
            'updated_at' => $news->updated_at,
            'nguoi_tao' => $news->nguoiTao ? [
                'ten' => $news->nguoiTao->HODEM_VA_TEN,
                'vaitro' => $news->nguoiTao->vaitro?->TEN_VAITRO ?? 'Không rõ',
            ] : ['ten' => 'Không xác định', 'vaitro' => 'Không rõ'],
            'nguoi_cap_nhat' => $news->nguoiCapNhat ? [
                'ten' => $news->nguoiCapNhat->HODEM_VA_TEN,
                'vaitro' => $news->nguoiCapNhat->vaitro?->TEN_VAITRO ?? 'Không rõ',
            ] : null,
        ];
    }
}