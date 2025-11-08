import React from "react";
// ----- SỬA LỖI: Thêm 'Navigate' -----
import { Routes, Route, Navigate } from "react-router-dom";

// Các import này là chính xác
import ListHoiDong from "./ListHoiDong";
import CreateHoiDong from "./CreateHoiDong";
import EditHoiDong from "./EditHoiDong";
import PhanboHoiDong from "./PhanboHoiDong";

const Hoidong = () => {
  return (
    <div>
      <Routes>
        {/* /admin/hoidong/ */}
        <Route path="/" element={<ListHoiDong />} />

        {/* /admin/hoidong/create */}
        <Route path="/create" element={<CreateHoiDong />} />

        {/* /admin/hoidong/detail/:id */}
        <Route path="/detail/:id" element={<EditHoiDong />} />

        {/* /admin/hoidong/phanbo */}
        <Route path="/phanbo" element={<PhanboHoiDong />} />
        
        {/* ----- SỬA LỖI: Thêm fallback route ----- */}
        <Route path="*" element={<Navigate to="/admin/hoidong" replace />} />
      </Routes>
    </div>
  );
};

export default Hoidong;