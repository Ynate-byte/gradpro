<?php

namespace App\Services;

use App\Models\KehoachKhoaluan;
use App\Models\Nguoidung;
use App\Models\Nhom;
use App\Models\ThanhvienNhom;
use Illuminate\Support\Facades\DB;

class AutoGroupingService
{
    public function execute(KehoachKhoaluan $plan, int $desiredMembers, string $priority)
    {
        return DB::transaction(function () use ($plan, $desiredMembers, $priority) {
            $allStudentUserIdsInPlan = Nguoidung::query()
                ->whereHas('sinhvien.cacDotThamGia', function ($query) use ($plan) {
                    $query->where('ID_KEHOACH', $plan->ID_KEHOACH);
                })
                ->pluck('ID_NGUOIDUNG');

            $studentsInGroupIds = ThanhvienNhom::query()
                ->whereHas('nhom', function($query) use ($plan) {
                    $query->where('ID_KEHOACH', $plan->ID_KEHOACH);
                })
                ->pluck('ID_NGUOIDUNG');

            $ungroupedStudents = Nguoidung::whereIn('ID_NGUOIDUNG', $allStudentUserIdsInPlan)
                ->where('TRANGTHAI_KICHHOAT', true)
                ->whereNotIn('ID_NGUOIDUNG', $studentsInGroupIds)
                ->with('sinhvien.chuyennganh')
                ->get()
                ->shuffle();

            $notFullGroups = $plan->nhoms()
                ->where('SO_THANHVIEN_HIENTAI', '<', $desiredMembers)
                ->where('LA_NHOM_DACBIET', false)
                ->get();

            $membersAddedCount = 0;
            $newGroupsCount = 0;

            // Lấp đầy các nhóm chưa đủ thành viên
            foreach ($notFullGroups as $group) {
                if ($ungroupedStudents->isEmpty()) break;

                $spaceLeft = $desiredMembers - $group->SO_THANHVIEN_HIENTAI;
                $studentsToFill = $ungroupedStudents->filter(function ($student) use ($group, $priority) {
                    if ($priority === 'chuyennganh' && $group->ID_CHUYENNGANH) {
                        return $student->sinhvien?->ID_CHUYENNGANH === $group->ID_CHUYENNGANH;
                    }
                    return true;
                })->take($spaceLeft);

                if ($studentsToFill->isNotEmpty()) {
                    $studentIds = $studentsToFill->pluck('ID_NGUOIDUNG');
                    foreach($studentIds as $id) {
                        ThanhvienNhom::create(['ID_NHOM' => $group->ID_NHOM, 'ID_NGUOIDUNG' => $id]);
                    }
                    $group->increment('SO_THANHVIEN_HIENTAI', $studentsToFill->count());
                    $membersAddedCount += $studentsToFill->count();
                    $ungroupedStudents = $ungroupedStudents->reject(fn($s) => $studentIds->contains($s->ID_NGUOIDUNG));
                }
            }

            // Tạo nhóm mới từ các sinh viên còn lại
            $studentsGroupedByPriority = $ungroupedStudents->groupBy(function ($student) use ($priority) {
                if ($priority === 'chuyennganh') {
                    return $student->sinhvien?->ID_CHUYENNGANH ?? 'no_major';
                }
                return 'no_priority';
            });

            foreach($studentsGroupedByPriority as $priorityId => $priorityGroup) {
                if ($priorityId === 'no_major' || $priorityId === 'no_priority') continue;

                foreach($priorityGroup->chunk($desiredMembers) as $chunk) {
                    if ($chunk->count() < 2) continue;

                    $leader = $chunk->first();
                    $majorCode = $leader->sinhvien?->chuyennganh?->MA_CHUYENNGANH ?? 'N/A';

                    $newGroup = Nhom::create([
                        'ID_KEHOACH' => $plan->ID_KEHOACH,
                        'TEN_NHOM' => "Nhóm tự động - {$majorCode} - " . substr(uniqid(), -4),
                        'ID_NHOMTRUONG' => $leader->ID_NGUOIDUNG,
                        'ID_CHUYENNGANH' => $leader->sinhvien?->ID_CHUYENNGANH,
                        'SO_THANHVIEN_HIENTAI' => $chunk->count(),
                    ]);
                    $newGroupsCount++;

                    $studentIdsForNewGroup = $chunk->pluck('ID_NGUOIDUNG');
                    $membersToInsert = $studentIdsForNewGroup->map(fn($id) => [
                        'ID_NHOM' => $newGroup->ID_NHOM,
                        'ID_NGUOIDUNG' => $id,
                        'NGAY_VAONHOM' => now(),
                    ])->all();
                    ThanhvienNhom::insert($membersToInsert);

                    $membersAddedCount += $chunk->count();
                    $ungroupedStudents = $ungroupedStudents->reject(fn($s) => $studentIdsForNewGroup->contains($s->ID_NGUOIDUNG));
                }
            }

            return [
                'message' => 'Quá trình ghép nhóm tự động đã hoàn tất.',
                'newGroupsCreated' => $newGroupsCount,
                'membersAdded' => $membersAddedCount,
                'leftoverStudents' => $ungroupedStudents->values()->all(),
            ];
        });
    }
}