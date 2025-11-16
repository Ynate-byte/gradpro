import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, BookText, Target, Award } from "lucide-react";

/**
 * Component con hiển thị từng mục chi tiết
 */
const DetailSection = ({ icon, title, content }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-primary">
        {React.cloneElement(icon, { className: "h-5 w-5" })}
      </span>
      <h4 className="text-lg font-semibold text-foreground">{title}</h4>
    </div>
    <p className="text-sm text-muted-foreground ml-8 whitespace-pre-wrap">
      {content || '(Chưa có thông tin)'}
    </p>
  </div>
);

/**
 * [PHIÊN BẢN NÂNG CẤP]
 * Dialog hiển thị thông tin chi tiết đề tài với giao diện mới.
 */
export function TopicDetailsDialog({ phancong, isOpen, setIsOpen }) {
  if (!phancong || !phancong.detai) return null; 

  const detai = phancong.detai;

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
            <h3 className="text-2xl font-semibold text-primary">{detai.TEN_DETAI}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-2">
              <span>
                Mã đề tài: <Badge variant="outline" className="font-mono">{detai.MA_DETAI || 'N/A'}</Badge>
              </span>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>GVHD: <strong>{detai.nguoi_dexuat?.nguoidung?.HODEM_VA_TEN || 'Chưa rõ'}</strong></span>
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