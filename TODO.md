# TODO: Add Reviewer Assignment Functionality

## Tasks
- [x] Create migration for `phancong_nguoi_gop_y` table
- [x] Create `PhancongNguoiGopY` model with relationships
- [x] Add `assignReviewers` method to TopicAssignmentController
- [x] Add `autoAssignReviewers` method to TopicAssignmentController
- [x] Update routes in api.php for new endpoints
- [x] Create DepartmentHead controllers that inherit from Admin/Lecturer controllers
- [x] Run migration to create table
- [x] Modify getTopicsForReviewers to retrieve approved/pending topics from all departments
- [x] Create DepartmentHead DetaiController with department filtering
- [x] Override assignReviewers in DepartmentHead controller to remove topic department check
- [x] Test reviewer assignment logic
