import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Các import này là chính xác
import ListHoiDong from "./ListHoiDong";
import EditHoiDong from "./EditHoiDong";
import PhanboHoiDong from "./PhanboHoiDong";

const Hoidong = () => {
  return (
    <div>
      <Routes>
        {/* /admin/hoidong/ */}
        <Route path="/" element={<ListHoiDong />} />

        {/* /admin/hoidong/detail/:id */}
        <Route path="/detail/:id" element={<EditHoiDong />} />

        {/* /admin/hoidong/phanbo */}
        <Route path="/phanbo" element={<PhanboHoiDong />} />
        
        <Route path="*" element={<Navigate to="/admin/hoidong" replace />} />
      </Routes>
    </div>
  );
};

export default Hoidong;