<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\News;
use App\Models\NewsImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException; // Đảm bảo đã import

class NewsController extends Controller
{
    /**
     * 🔹 Kiểm tra quyền Admin
     */
    private function isAdmin(): bool
    {
        return Auth::check() && Auth::user()->ID_VAITRO == 1; // Giả sử ID 1 là Admin
    }

    /* ===========================================================
     | ✅ LẤY DANH SÁCH TIN TỨC
     =========================================================== */
    public function index()
    {
        try {
            // Đảm bảo load đúng relationship 'vaitro' (chữ v thường)
            $newsList = News::with([
                // Chọn cụ thể các cột cần thiết từ nguoiTao và vaitro liên quan
                'nguoiTao' => function ($query) {
                    $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO') // Cần ID_VAITRO để load vaitro
                          ->with('vaitro:ID_VAITRO,TEN_VAITRO'); // Load vaitro với các cột cần thiết
                },
                // Tương tự cho nguoiCapNhat
                'nguoiCapNhat' => function ($query) {
                    $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO') // Cần ID_VAITRO
                          ->with('vaitro:ID_VAITRO,TEN_VAITRO');
                },
                'images' // Load danh sách ảnh phụ
            ])
            ->orderByDesc('created_at') // Sắp xếp tin mới nhất lên đầu
            ->get();

            // Map dữ liệu trả về client, sử dụng null-safe operator (?->) và null coalescing (??)
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
                    'vaitro' => $item->nguoiTao?->vaitro?->TEN_VAITRO ?? 'Không rõ', // Truy cập an toàn
                ],
                'nguoi_cap_nhat' => $item->nguoiCapNhat ? [
                    'ten' => $item->nguoiCapNhat->HODEM_VA_TEN,
                    'vaitro' => $item->nguoiCapNhat->vaitro?->TEN_VAITRO ?? 'Không rõ', // Truy cập an toàn
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
                'trace' => $e->getTraceAsString() // Thêm trace để biết lỗi ở đâu
            ]);
            // Trả về lỗi 500 với thông báo chung chung
            return response()->json(['error' => 'Không thể tải danh sách tin tức. Vui lòng kiểm tra log server.'], 500);
        }
    }


    /* ===========================================================
     | ✅ THÊM TIN TỨC MỚI
     =========================================================== */
    public function store(Request $request)
    {
        try {
            if (!$this->isAdmin()) {
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
                'data' => $this->formatNewsData($news), // Sử dụng helper để format data
            ], 201);

        } catch (ValidationException $e) { // Bắt lỗi validation cụ thể
             Log::error('News.store Validation Error', ['errors' => $e->errors()]);
             // Trả về lỗi 422 với cấu trúc chuẩn
             return response()->json([
                 'message' => 'Dữ liệu không hợp lệ.',
                 'errors' => $e->errors()
             ], 422);
        } catch (\Throwable $e) { // Bắt các lỗi khác
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
                // Tải nguoiTao và vaitro liên quan, chỉ lấy các cột cần thiết
                'nguoiTao' => function ($query) {
                    $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO')->with('vaitro:ID_VAITRO,TEN_VAITRO');
                },
                // Tương tự cho nguoiCapNhat
                'nguoiCapNhat' => function ($query) {
                    $query->select('ID_NGUOIDUNG', 'HODEM_VA_TEN', 'ID_VAITRO')->with('vaitro:ID_VAITRO,TEN_VAITRO');
                },
                'images'
            ])->findOrFail($id); // Sử dụng findOrFail để tự động trả về 404 nếu không tìm thấy

            return response()->json($this->formatNewsData($news)); // Format dữ liệu trước khi trả về

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
            if (!$this->isAdmin()) {
                return response()->json(['error' => 'Bạn không có quyền chỉnh sửa tin tức.'], 403);
            }

            $news = News::findOrFail($id); // Tìm news hoặc báo lỗi 404

            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255', // 'sometimes' để không bắt buộc nếu không gửi lên
                'content' => 'sometimes|required|string',
                'pdf_file' => 'nullable|file|mimes:pdf|max:20480',
                'cover_image' => 'nullable|image|mimes:jpg,jpeg,png|max:5120',
                'images.*' => 'nullable|image|mimes:jpg,jpeg,png|max:5120',
                'category' => 'nullable|string|max:100',
                'deleted_images' => 'nullable|array', // Mảng các URL/tên file ảnh phụ cần xóa
                'deleted_images.*' => 'string',
                'remove_pdf' => 'nullable|boolean', // Flag để xóa pdf hiện tại
                'remove_cover_image' => 'nullable|boolean', // Flag để xóa ảnh bìa hiện tại
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
            } elseif ($request->input('remove_pdf') == true) { // Nếu có flag yêu cầu xóa pdf
                Storage::disk('public')->delete($news->pdf_file ?? '');
                $news->pdf_file = null;
            }

            // Xử lý ảnh bìa mới hoặc xóa ảnh cũ
            if ($request->hasFile('cover_image')) {
                Storage::disk('public')->delete($news->cover_image ?? ''); // Xóa ảnh cũ nếu có
                $news->cover_image = $request->file('cover_image')->store('news/covers', 'public');
            } elseif ($request->input('remove_cover_image') == true) { // Nếu có flag yêu cầu xóa ảnh bìa
                Storage::disk('public')->delete($news->cover_image ?? '');
                $news->cover_image = null;
            }

            $news->save(); // Lưu các thay đổi vào DB

            // Xử lý xóa ảnh phụ
            if (!empty($validated['deleted_images'])) {
                $filenamesToDelete = $validated['deleted_images'];

                // Tìm các bản ghi NewsImage dựa trên filename (cần khớp với DB)
                $imagesToDeleteQuery = NewsImage::where('news_id', $news->id);

                // Xây dựng query động để tìm các filename
                 $imagesToDeleteQuery->where(function ($query) use ($filenamesToDelete) {
                    foreach ($filenamesToDelete as $filename) {
                         // Cần logic để lấy đúng tên file lưu trong DB từ URL gửi lên (ví dụ: lấy phần cuối của path)
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
                'data' => $this->formatNewsData($news), // Sử dụng helper để format data
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


    /* ===========================================================
     | ✅ XÓA TIN TỨC
     =========================================================== */
    public function destroy($id)
    {
        try {
            if (!$this->isAdmin()) {
                return response()->json(['error' => 'Bạn không có quyền xóa tin tức.'], 403);
            }

            $news = News::with('images')->findOrFail($id); // Load kèm images để xóa file

            // Xóa file vật lý trước
            Storage::disk('public')->delete($news->pdf_file ?? '');
            Storage::disk('public')->delete($news->cover_image ?? '');
            foreach ($news->images as $img) {
                Storage::disk('public')->delete($img->filename);
            }
            // Không cần xóa NewsImage riêng vì model News dùng SoftDeletes,
            // nhưng nếu News bị xóa vĩnh viễn (forceDelete), cần xóa NewsImage trước hoặc dùng cascade delete.

            $news->deleted_by = Auth::id(); // Ghi nhận người xóa
            $news->save(); // Lưu deleted_by
            $news->delete(); // Thực hiện soft delete

            return response()->json(['message' => 'Đã xóa tin tức thành công!']);
       } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('News.destroy Not Found', ['id' => $id]);
            return response()->json(['error' => 'Không tìm thấy tin tức để xóa.'], 404);
        } catch (\Throwable $e) {
            Log::error('News.destroy Error', ['id' => $id, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Lỗi xóa tin tức.'], 500);
        }
    }

    /* ===========================================================
     | ✅ XEM FILE PDF
     =========================================================== */
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
                    // Header này gợi ý trình duyệt hiển thị file thay vì tải xuống
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
        // Đảm bảo các quan hệ cần thiết đã được load (loadMissing chỉ load nếu chưa có)
        $news->loadMissing(['nguoiTao.vaitro', 'nguoiCapNhat.vaitro', 'images']);

        return [
            'id' => $news->id,
            'title' => $news->title,
            'content' => $news->content,
            'category' => $news->category ?? 'Chưa phân loại',
            'pdf_url' => $news->pdf_url, // Sử dụng Accessor
            'cover_image_url' => $news->cover_image_url, // Sử dụng Accessor
            'images' => $news->images_urls, // Sử dụng Accessor
            'created_at' => $news->created_at,
            'updated_at' => $news->updated_at,
            'nguoi_tao' => $news->nguoiTao ? [ // Kiểm tra null trước khi truy cập
                'ten' => $news->nguoiTao->HODEM_VA_TEN,
                'vaitro' => $news->nguoiTao->vaitro?->TEN_VAITRO ?? 'Không rõ', // Null safe cho vaitro
            ] : ['ten' => 'Không xác định', 'vaitro' => 'Không rõ'], // Giá trị mặc định nếu nguoiTao là null
            'nguoi_cap_nhat' => $news->nguoiCapNhat ? [ // Kiểm tra null
                'ten' => $news->nguoiCapNhat->HODEM_VA_TEN,
                'vaitro' => $news->nguoiCapNhat->vaitro?->TEN_VAITRO ?? 'Không rõ', // Null safe cho vaitro
            ] : null, // Trả về null nếu không có người cập nhật
        ];
    }
}