import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, BookText, Target, Award, Layers } from "lucide-react";

const DetailSection = ({ icon, title, content }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-primary">
        {React.cloneElement(icon, { className: "h-5 w-5" })}
      </span>
      <h4 className="text-lg font-semibold text-foreground">{title}</h4>
    </div>
    <div className="text-sm text-muted-foreground ml-8 whitespace-pre-wrap p-3 bg-muted/20 rounded-md">
      {content || '(Chưa có thông tin)'}
    </div>
  </div>
);

export function TopicDetailsDialog({ phancong, isOpen, setIsOpen }) {
  if (!phancong || !phancong.detai) return null; 

  const detai = phancong.detai;
  // [SỬA] Lấy tên bộ môn
  const departmentName = detai.khoaBomon?.TEN_KHOA_BOMON || detai.ten_bo_mon || 'Chưa cập nhật';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thông tin chi tiết Đề tài</DialogTitle>
          <DialogDescription>
            Tổng quan về đề tài và các yêu cầu liên quan.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          
          {/* 1. Thông tin chính */}
          <div>
            <h3 className="text-2xl font-semibold text-primary leading-tight">{detai.TEN_DETAI}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-3">
              <span className="flex items-center gap-1">
                <Badge variant="outline" className="font-mono text-xs">#{detai.MA_DETAI || 'N/A'}</Badge>
              </span>
              
              <Separator orientation="vertical" className="h-4" />
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>GVHD: <strong className="text-foreground">{detai.nguoi_dexuat?.nguoidung?.HODEM_VA_TEN || 'Chưa rõ'}</strong></span>
              </div>

              <Separator orientation="vertical" className="h-4" />

              {/* [SỬA] Hiển thị Bộ môn */}
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <span>Bộ môn: <strong className="text-foreground">{departmentName}</strong></span>
              </div>
            </div>
          </div>

          <Separator />

          {/* 2. Các mục chi tiết */}
          <div className="space-y-6">
            <DetailSection 
              icon={<BookText />} 
              title="Mô tả" 
              content={detai.MOTA} 
            />
            <DetailSection 
              icon={<Target />} 
              title="Yêu cầu" 
              content={detai.YEUCAU} 
            />
            <DetailSection 
              icon={<Award />} 
              title="Kết quả mong đợi" 
              content={detai.KETQUA_MONGDOI} 
            />
          </div>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}