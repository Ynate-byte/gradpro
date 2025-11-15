import * as React from "react"
import { CheckIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import {
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"

/**
 * Hiển thị một nhóm các tùy chọn lọc (checkbox) bên trong CommandList.
 * Component này không tự chứa Popover hay Command.
 */
export function DataTableFacetedFilterGroup({ column, title, options, className }) {
  // Đảm bảo lấy giá trị lọc dưới dạng mảng (nếu có)
  const filterValue = column?.getFilterValue();
  const selectedValues = new Set(Array.isArray(filterValue) ? filterValue : (filterValue ? [filterValue] : []));
  
  // [THÊM MỚI] Biến kiểm tra
  const areAllSelected = options.length > 0 && selectedValues.size === options.length;

  if (!column) return null;

  return (
    <CommandGroup heading={title} className={cn("p-1", className)}>
      {/* ----- [THÊM MỚI "CHỌN TẤT CẢ"] ----- */}
      {options.length > 0 && (
        <>
          <CommandItem
            onSelect={() => {
              if (areAllSelected) {
                // Bỏ chọn tất cả
                column?.setFilterValue(undefined);
              } else {
                // Chọn tất cả
                column?.setFilterValue(options.map((o) => o.value));
              }
            }}
          >
            <div
              className={cn(
                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                areAllSelected
                  ? "bg-primary text-primary-foreground"
                  : "opacity-50 [&_svg]:invisible"
              )}
            >
              <CheckIcon className={cn("h-4 w-4")} />
            </div>
            <span>Tất cả</span>
          </CommandItem>
          <CommandSeparator />
        </>
      )}
      
      {/* ----- [Danh sách các tùy chọn] ----- */}
      {options.map((option) => {
        const isSelected = selectedValues.has(option.value)
        return (
          <CommandItem
            key={option.value}
            onSelect={() => {
              // Sử dụng Set để thao tác dễ dàng
              const newSelectedValues = new Set(selectedValues);
              
              if (isSelected) {
                newSelectedValues.delete(option.value)
              } else {
                newSelectedValues.add(option.value)
              }
              
              const filterValues = Array.from(newSelectedValues)
              
              // Đặt giá trị lọc: mảng nếu có phần tử, undefined nếu không có (để xóa lọc)
              column?.setFilterValue(
                filterValues.length ? filterValues : undefined
              )
            }}
          >
            <div
              className={cn(
                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "opacity-50 [&_svg]:invisible"
              )}
            >
              <CheckIcon className={cn("h-4 w-4")} />
            </div>
            <span>{option.label}</span>
          </CommandItem>
        )
      })}
      
      {/* Nút xóa bộ lọc riêng lẻ cho nhóm này */}
      {selectedValues.size > 0 && (
        <>
          <CommandSeparator />
          <CommandItem
            onSelect={() => column?.setFilterValue(undefined)}
            className="justify-center text-center text-xs text-muted-foreground opacity-80"
          >
            Xóa bộ lọc {title}
          </CommandItem>
        </>
      )}
    </CommandGroup>
  )
}