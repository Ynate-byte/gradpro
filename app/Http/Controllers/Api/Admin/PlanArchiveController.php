<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\KehoachKhoaluan;
use App\Models\FileNopSanpham;
use App\Models\Detai;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use ZipArchive;
use Illuminate\Support\Facades\File;

class PlanArchiveController extends Controller
{
    /**
     * Sao lưu (Archive) một kế hoạch cụ thể
     * Params: include_files (boolean) - Có backup kèm file vật lý (PDF, Zip...) không
     */
    public function archive(Request $request, $id)
    {
        // 1. Kiểm tra tùy chọn có bao gồm file vật lý không
        $includeFiles = $request->boolean('include_files', false);

        // 2. Tải toàn bộ dữ liệu liên quan (Deep Loading)
        // Load tất cả các quan hệ để đảm bảo dữ liệu JSON đầy đủ nhất
        $plan = KehoachKhoaluan::with([
            'mocThoigians',
            'detais',
            'nhoms.thanhviens',
            'nhoms.phancongDetaiNhom.submissions.files', // Để lấy đường dẫn file
            'nhoms.congViecs.checklistItems', // Kanban tasks & checklist
            'nhoms.congViecs.allComments', // Kanban comments
            'nhoms.lichHops',
            'nhoms.diemTongKet',
            'nhoms.diemHuongDan',
            'nhoms.diemPhanBien',
            'nhoms.diemHoiDong',
            'hoidongs.giangviens',
            'sinhvienThamgias',
            'quotaKhoaBomons',
            'quotaGiangviens'
        ])->findOrFail($id);

        $timestamp = time();
        $tempDir = storage_path('app/temp_archive_' . $id . '_' . $timestamp);
        
        if (!File::exists($tempDir)) {
            File::makeDirectory($tempDir, 0755, true);
        }

        try {
            // 3. Tạo file JSON dữ liệu
            $jsonData = $plan->toJson(JSON_PRETTY_PRINT);
            File::put($tempDir . '/data.json', $jsonData);

            // 4. Copy các file vật lý (CHỈ KHI ĐƯỢC YÊU CẦU)
            if ($includeFiles) {
                $filesDir = $tempDir . '/files';
                File::makeDirectory($filesDir);
                
                foreach ($plan->nhoms as $nhom) {
                    if ($nhom->phancongDetaiNhom) {
                        foreach ($nhom->phancongDetaiNhom->submissions as $submission) {
                            foreach ($submission->files as $file) {
                                // Bỏ qua link, chỉ copy file thật và file phải tồn tại trên ổ cứng
                                if ($file->DUONG_DAN_HOAC_NOI_DUNG && 
                                    !in_array($file->LOAI_FILE, ['LinkDemo', 'LinkRepository']) &&
                                    Storage::disk('local')->exists($file->DUONG_DAN_HOAC_NOI_DUNG)) {
                                    
                                    // Giữ nguyên cấu trúc thư mục gốc để dễ restore
                                    // Path gốc VD: submissions/plan_1/group_5/baocao.pdf
                                    $destPath = $filesDir . '/' . $file->DUONG_DAN_HOAC_NOI_DUNG;
                                    $destDir = dirname($destPath);
                                    
                                    if (!File::exists($destDir)) {
                                        File::makeDirectory($destDir, 0755, true);
                                    }
                                    
                                    Storage::disk('local')->copy(
                                        $file->DUONG_DAN_HOAC_NOI_DUNG, 
                                        'temp_archive_' . $id . '_' . $timestamp . '/files/' . $file->DUONG_DAN_HOAC_NOI_DUNG
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // 5. Nén thành ZIP
            $suffix = $includeFiles ? '_FULL' : '_DB_ONLY';
            // Tạo tên file an toàn (bỏ ký tự lạ)
            $safeName = preg_replace('/[^A-Za-z0-9_\-]/', '', str_replace(' ', '_', $plan->TEN_DOT));
            $zipFileName = 'backup_' . $plan->KHOAHOC . '_' . $safeName . $suffix . '_' . date('Ymd_His') . '.zip';
            $zipPath = storage_path('app/' . $zipFileName);
            
            $zip = new ZipArchive;
            if ($zip->open($zipPath, ZipArchive::CREATE) === TRUE) {
                // Thêm file data.json
                $zip->addFile($tempDir . '/data.json', 'data.json');

                // Thêm thư mục files (nếu có và user chọn include)
                if ($includeFiles && File::exists($tempDir . '/files')) {
                    $files = new \RecursiveIteratorIterator(
                        new \RecursiveDirectoryIterator($tempDir . '/files'),
                        \RecursiveIteratorIterator::LEAVES_ONLY
                    );

                    foreach ($files as $name => $file) {
                        if (!$file->isDir()) {
                            $filePath = $file->getRealPath();
                            // Tính đường dẫn tương đối để add vào zip
                            $relativePath = 'files/' . substr($filePath, strlen($tempDir . '/files') + 1);
                            $zip->addFile($filePath, $relativePath);
                        }
                    }
                }
                $zip->close();
            }

            // 6. Dọn dẹp thư mục tạm
            File::deleteDirectory($tempDir);

            // 7. Trả về file download và xóa sau khi gửi xong
            return response()->download($zipPath)->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            // Dọn dẹp nếu lỗi
            if (File::exists($tempDir)) {
                File::deleteDirectory($tempDir);
            }
            Log::error("Archive Failed: " . $e->getMessage());
            return response()->json(['message' => 'Lỗi sao lưu: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Phục hồi (Restore) kế hoạch từ file ZIP
     * Params: skip_files (boolean) - Có bỏ qua việc chép file vật lý không (nếu backup có file nhưng muốn restore nhanh)
     */
    public function restore(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:zip|max:102400', // Max 100MB
            'skip_files' => 'nullable|boolean'
        ]);

        $zipFile = $request->file('file');
        // Nếu user chọn skip_files = true, ta sẽ không chép file từ zip ra storage (dù zip có file)
        $skipFiles = $request->boolean('skip_files', false); 

        $tempDir = storage_path('app/temp_restore_' . time());
        
        try {
            // 1. Giải nén
            $zip = new ZipArchive;
            if ($zip->open($zipFile->getRealPath()) === TRUE) {
                $zip->extractTo($tempDir);
                $zip->close();
            } else {
                throw new \Exception("Không thể mở file ZIP.");
            }

            if (!File::exists($tempDir . '/data.json')) {
                throw new \Exception("File backup không hợp lệ (thiếu data.json).");
            }

            // 2. Đọc dữ liệu JSON
            $jsonContent = File::get($tempDir . '/data.json');
            $data = json_decode($jsonContent, true);

            DB::beginTransaction();

            // 3. Tái tạo Kế hoạch (Tạo ID mới để tránh xung đột)
            // Loại bỏ ID cũ và các timestamp, quan hệ con
            $planData = collect($data)->except([
                'ID_KEHOACH', 'created_at', 'updated_at', 'NGAYTAO', 'NGAYCAPNHAT', 
                'moc_thoigians', 'detais', 'nhoms', 'hoidongs', 'sinhvien_thamgias', 'quota_khoa_bomons', 'quota_giangviens'
            ])->toArray();
            
            $planData['TEN_DOT'] = $planData['TEN_DOT'];
            
            // Giữ nguyên trạng thái cũ (Đã hoàn thành, Đang thực hiện...)
            $planData['TRANGTHAI'] = $data['TRANGTHAI']; 
            
            $planData['NGAYTAO'] = now();

            $newPlan = KehoachKhoaluan::create($planData);
            $newPlanId = $newPlan->ID_KEHOACH;

            // 4. Tái tạo các dữ liệu con
            
            // A. Mốc thời gian
            foreach ($data['moc_thoigians'] ?? [] as $moc) {
                $moc['ID_KEHOACH'] = $newPlanId;
                unset($moc['ID']);
                \App\Models\MocThoigian::create($moc);
            }

            // B. Sinh viên tham gia
            foreach ($data['sinhvien_thamgias'] ?? [] as $sv) {
                $sv['ID_KEHOACH'] = $newPlanId;
                unset($sv['ID_THAMGIA']);
                \App\Models\SinhvienThamgia::create($sv);
            }

            // C. Quota
            foreach ($data['quota_khoa_bomons'] ?? [] as $q) {
                $q['ID_KEHOACH'] = $newPlanId;
                unset($q['ID_QUOTA']);
                \App\Models\QuotaKhoaBomon::create($q);
            }
            foreach ($data['quota_giangviens'] ?? [] as $q) {
                $q['ID_KEHOACH'] = $newPlanId;
                unset($q['ID_QUOTA']);
                \App\Models\QuotaGiangvien::create($q);
            }

            // D. Đề tài (LOGIC QUAN TRỌNG: MAPPING ĐỀ TÀI CŨ)
            $detaiIdMap = []; // Map: Old_ID (backup) => New_ID (DB)
            
            foreach ($data['detais'] ?? [] as $dt) {
                $oldIdInBackup = $dt['ID_DETAI']; 
                $dt['ID_KEHOACH'] = $newPlanId; // Gán ID kế hoạch mới
                unset($dt['ID_DETAI']); // Bỏ ID cũ

                // Tìm xem đề tài này có đang tồn tại trong DB không
                // (Dựa vào Mã đề tài là Unique)
                $existingTopic = \App\Models\Detai::where('MA_DETAI', $dt['MA_DETAI'])->first();

                if ($existingTopic) {
                    // ==> TRƯỜNG HỢP 1: TÌM THẤY (MAPPING)
                    // Đây là trường hợp tái sử dụng: Đề tài đã có trong DB (có thể do giữ lại khi xóa kế hoạch cũ)
                    // Ta cập nhật nó trỏ về Kế hoạch mới này
                    $existingTopic->update([
                        'ID_KEHOACH' => $newPlanId,
                        // Có thể update thêm thông tin khác nếu muốn đồng bộ
                        // 'TEN_DETAI' => $dt['TEN_DETAI'], 
                    ]);
                    
                    // Lưu mapping: ID backup -> ID thực tế
                    $detaiIdMap[$oldIdInBackup] = $existingTopic->ID_DETAI;
                    
                    Log::info("Restore: Re-mapped existing topic [{$dt['MA_DETAI']}] to new plan.");
                } else {
                    // ==> TRƯỜNG HỢP 2: KHÔNG TÌM THẤY (TẠO MỚI)
                    // Đề tài này chưa có hoặc đã bị xóa hẳn -> Tạo mới
                    $newDetai = \App\Models\Detai::create($dt);
                    
                    // Lưu mapping: ID backup -> ID mới tạo
                    $detaiIdMap[$oldIdInBackup] = $newDetai->ID_DETAI;
                }
            }

            // E. Hội đồng (Map ID để gán nhóm)
            $hoidongIdMap = [];
            foreach ($data['hoidongs'] ?? [] as $hd) {
                $oldId = $hd['ID_HOIDONG'];
                $hd['ID_KEHOACH'] = $newPlanId;
                unset($hd['ID_HOIDONG']);
                
                $giangviens = $hd['giangviens'] ?? [];
                unset($hd['giangviens']);
                
                $newHoidong = \App\Models\Hoidong::create($hd);
                $hoidongIdMap[$oldId] = $newHoidong->ID_HOIDONG;

                // Attach giảng viên vào hội đồng
                foreach ($giangviens as $gv) {
                    $newHoidong->giangviens()->attach($gv['ID_GIANGVIEN'], ['VAITRO' => $gv['pivot']['VAITRO']]);
                }
            }

            // F. Nhóm & Dữ liệu liên quan (Phức tạp nhất)
            foreach ($data['nhoms'] ?? [] as $nhomData) {
                $oldNhomId = $nhomData['ID_NHOM'];
                $nhomData['ID_KEHOACH'] = $newPlanId;
                unset($nhomData['ID_NHOM']);
                
                // Tách quan hệ
                $thanhviens = $nhomData['thanhviens'] ?? [];
                $phancong = $nhomData['phancong_detai_nhom'] ?? null;
                $congviecs = $nhomData['cong_viecs'] ?? [];
                $lichhops = $nhomData['lich_hops'] ?? [];
                $oldHoidongs = $nhomData['hoidongs'] ?? []; // Có thể có trong json nếu eager load sâu
                
                // Các bảng điểm
                $diemTongKet = $nhomData['diem_tong_ket'] ?? null;
                $diemHuongDan = $nhomData['diem_huong_dan'] ?? [];
                $diemPhanBien = $nhomData['diem_phan_bien'] ?? [];
                $diemHoiDong = $nhomData['diem_hoi_dong'] ?? [];

                // Xóa key quan hệ khỏi mảng chính để create
                unset(
                    $nhomData['thanhviens'], $nhomData['phancong_detai_nhom'], 
                    $nhomData['cong_viecs'], $nhomData['lich_hops'], 
                    $nhomData['diem_tong_ket'], $nhomData['diem_huong_dan'], 
                    $nhomData['diem_phan_bien'], $nhomData['diem_hoi_dong'],
                    $nhomData['hoidongs']
                );

                $newNhom = \App\Models\Nhom::create($nhomData);
                $newNhomId = $newNhom->ID_NHOM;

                // F1. Thành viên
                foreach ($thanhviens as $tv) {
                    $tv['ID_NHOM'] = $newNhomId;
                    unset($tv['ID_THANHVIEN']);
                    \App\Models\ThanhvienNhom::create($tv);
                }

                // F2. Phân công đề tài & Nộp bài
                if ($phancong) {
                    $phancong['ID_NHOM'] = $newNhomId;
                    
                    // Sử dụng ID Đề tài đã map (từ bước D)
                    // Nếu không tìm thấy map (trường hợp hiếm), gán null để tránh lỗi
                    $mappedTopicId = $detaiIdMap[$phancong['ID_DETAI']] ?? null;
                    
                    if ($mappedTopicId) {
                        $phancong['ID_DETAI'] = $mappedTopicId;
                        unset($phancong['ID_PHANCONG']);
                        
                        $submissions = $phancong['submissions'] ?? [];
                        unset($phancong['submissions'], $phancong['detai'], $phancong['gvhd']);

                        $newPhanCong = \App\Models\PhancongDetaiNhom::create($phancong);

                        // Xử lý bài nộp & File
                        foreach ($submissions as $sub) {
                            $sub['ID_PHANCONG'] = $newPhanCong->ID_PHANCONG;
                            $files = $sub['files'] ?? [];
                            unset($sub['ID_NOP_SANPHAM'], $sub['files']);
                            
                            $newSub = \App\Models\NopSanpham::create($sub);

                            foreach ($files as $file) {
                                $file['ID_NOP_SANPHAM'] = $newSub->ID_NOP_SANPHAM;
                                $oldPath = $file['DUONG_DAN_HOAC_NOI_DUNG'];
                                
                                // Xử lý File Vật lý
                                if ($file['LOAI_FILE'] !== 'LinkDemo' && $file['LOAI_FILE'] !== 'LinkRepository') {
                                    if (!$skipFiles) {
                                        $fileName = basename($oldPath);
                                        // Tạo đường dẫn mới tương ứng với nhóm mới
                                        $newPath = "submissions/plan_{$newPlanId}/group_{$newNhomId}/{$fileName}";
                                        
                                        // Tìm file trong thư mục giải nén
                                        // Trong zip, nó nằm ở files/submissions/plan_OLD/group_OLD/file.pdf
                                        // Storage copy ở hàm archive dùng path tương đối
                                        $sourceFileInTemp = $tempDir . '/files/' . $oldPath;

                                        if (File::exists($sourceFileInTemp)) {
                                            Storage::disk('local')->put($newPath, File::get($sourceFileInTemp));
                                            $file['DUONG_DAN_HOAC_NOI_DUNG'] = $newPath;
                                        }
                                    }
                                }
                                
                                unset($file['ID_FILE']);
                                \App\Models\FileNopSanpham::create($file);
                            }
                        }
                    }
                }
                
                // F3. Kanban Tasks
                foreach ($congviecs as $cv) {
                    $cv['ID_NHOM'] = $newNhomId;
                    $checklists = $cv['checklist_items'] ?? [];
                    unset($cv['ID_CONGVIEC'], $cv['checklist_items'], $cv['all_comments']);
                    
                    $newCv = \App\Models\CongViec::create($cv);
                    
                    foreach ($checklists as $ck) {
                        $ck['ID_CONGVIEC'] = $newCv->ID_CONGVIEC;
                        unset($ck['ID_MUCON']);
                        \App\Models\DanhSachKiemTraCongViec::create($ck);
                    }
                }
                
                // F4. Lịch họp
                foreach ($lichhops as $lh) {
                    $lh['ID_NHOM'] = $newNhomId;
                    unset($lh['ID_LICHHOP']);
                    \App\Models\LichHop::create($lh);
                }

                // F5. Điểm số
                if ($diemTongKet) {
                    $diemTongKet['ID_NHOM'] = $newNhomId;
                    unset($diemTongKet['ID_DIEMTK']);
                    \App\Models\DiemTongKet::create($diemTongKet);
                }
                foreach ($diemHuongDan as $d) {
                    $d['ID_NHOM'] = $newNhomId;
                    unset($d['ID_DIEM_HD']);
                    \App\Models\DiemHuongDan::create($d);
                }
                foreach ($diemPhanBien as $d) {
                    $d['ID_NHOM'] = $newNhomId;
                    unset($d['ID_DIEM_PB']);
                    \App\Models\DiemPhanBien::create($d);
                }
                foreach ($diemHoiDong as $d) {
                    $d['ID_NHOM'] = $newNhomId;
                    unset($d['ID_DIEM_HDONG']);
                    \App\Models\DiemHoiDong::create($d);
                }

                // F6. Gán lại Hội đồng cho Nhóm (Nếu có dữ liệu trong JSON)
                // Vì quan hệ Many-to-Many nên phải attach tay
                // Lưu ý: JSON phải chứa 'hoidongs' bên trong 'nhoms' (tùy thuộc vào cách load lúc archive)
                // Tuy nhiên, ở hàm archive() ta đã load 'nhoms', nhưng chưa load 'nhoms.hoidongs'.
                // Nếu muốn restore cả quan hệ này, hàm archive cần thêm 'nhoms.hoidongs'.
                // Dưới đây là logic dự phòng nếu có dữ liệu đó:
                /*
                if (!empty($oldHoidongs)) {
                    foreach ($oldHoidongs as $oldHd) {
                        $newHdId = $hoidongIdMap[$oldHd['ID_HOIDONG']] ?? null;
                        if ($newHdId) {
                             $newNhom->hoidongs()->attach($newHdId);
                        }
                    }
                }
                */
            }

            DB::commit();
            File::deleteDirectory($tempDir);

            return response()->json(['message' => 'Phục hồi kế hoạch thành công!'], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            File::deleteDirectory($tempDir);
            Log::error("Restore Plan Failed: " . $e->getMessage());
            return response()->json(['message' => 'Lỗi phục hồi: ' . $e->getMessage()], 500);
        }
    }
}