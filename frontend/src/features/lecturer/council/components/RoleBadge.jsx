import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RoleBadge = ({ role }) => {
  let label = "Thành viên";
  let className = "text-muted-foreground border-muted-foreground/20 bg-muted/30";
  
  if (role === 'chutich') { 
    className = "text-red-700 border-red-200 bg-red-50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"; 
    label = "Chủ tịch"; 
  } else if (role === 'thuky') { 
    className = "text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"; 
    label = "Thư ký"; 
  } else if (role === 'phanbien') { 
    className = "text-orange-700 border-orange-200 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"; 
    label = "Phản biện"; 
  }

  return (
    <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 font-semibold shadow-sm", className)}>
      {label}
    </Badge>
  );
};

export default RoleBadge;