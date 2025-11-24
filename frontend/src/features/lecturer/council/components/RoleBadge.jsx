import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RoleBadge = ({ role }) => {
  let label = "Thành viên";
  let className = "text-muted-foreground border-muted-foreground/20 bg-muted/30";
  
  if (role === 'chutich') { 
    className = "text-red-600 border-red-200 bg-red-50"; 
    label = "Chủ tịch"; 
  } else if (role === 'thuky') { 
    className = "text-blue-600 border-blue-200 bg-blue-50"; 
    label = "Thư ký"; 
  } else if (role === 'phanbien') { 
    className = "text-orange-600 border-orange-200 bg-orange-50"; 
    label = "Phản biện"; 
  }

  return (
    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4.5 font-medium", className)}>
      {label}
    </Badge>
  );
};

export default RoleBadge;