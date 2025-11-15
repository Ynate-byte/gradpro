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
  // Lấy các giá trị đang được lọc (lọc đa giá trị)
  // Lưu ý: column?.getFilterValue() có thể trả về một mảng (nếu là multi-select) hoặc một giá trị đơn.
  const filterValue = column?.getFilterValue() || [];
  const selectedValues = new Set(Array.isArray(filterValue) ? filterValue : [filterValue]);
  
  // [THÊM MỚI] Biến kiểm tra: Đúng nếu tất cả các tùy chọn đều có trong selectedValues
  const areAllSelected = options.length > 0 && selectedValues.size === options.length;

  if (!column) return null;

  return (
    <CommandGroup heading={title} className={cn("p-1", className)}>
      {/* ----- [THÊM MỚI "CHỌN TẤT CẢ"] ----- */}
      {options.length > 0 && ( // Chỉ hiển thị nếu có tùy chọn
        <>
          <CommandItem
            onSelect={() => {
              if (areAllSelected) {
                // Nếu đã chọn tất cả, hủy lọc (set undefined)
                column?.setFilterValue(undefined);
              } else {
                // Nếu chưa chọn tất cả, chọn tất cả giá trị
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
      {/* ----- [KẾT THÚC THÊM MỚI] ----- */}
      
      {options.map((option) => {
        const isSelected = selectedValues.has(option.value)
        return (
          <CommandItem
            key={option.value}
            onSelect={() => {
              // Xử lý logic chọn/bỏ chọn từng mục
              let newSelectedValues = new Set(selectedValues);

              if (isSelected) {
                newSelectedValues.delete(option.value)
              } else {
                newSelectedValues.add(option.value)
              }

              const filterValues = Array.from(newSelectedValues)

              // Cập nhật giá trị lọc: nếu có giá trị đã chọn thì dùng mảng, không thì dùng undefined để xóa lọc
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
      
      {/* Nút Xóa bộ lọc */}
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