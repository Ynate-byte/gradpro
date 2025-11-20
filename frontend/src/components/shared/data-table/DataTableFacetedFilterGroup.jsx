import * as React from "react"
import { Check, MinusCircle, ListFilter } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"

export function DataTableFacetedFilterGroup({ column, title, options, className }) {
  const filterValue = column?.getFilterValue();
  const selectedValues = new Set(Array.isArray(filterValue) ? filterValue : (filterValue ? [filterValue] : []));
  
  const areAllSelected = options.length > 0 && selectedValues.size === options.length;

  if (!column) return null;

  return (
    <CommandGroup className={cn("p-0", className)}>
        {/* [UI] Header nhỏ cho nhóm (Tùy chọn, nếu muốn hiện tên cột bên trong) */}
        {/* <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center bg-muted/30">
            {title}
        </div> */}

      {options.length > 0 && (
        <>
          <CommandItem
            onSelect={() => {
              if (areAllSelected) {
                column?.setFilterValue(undefined);
              } else {
                column?.setFilterValue(options.map((o) => o.value));
              }
            }}
            className="flex items-center justify-between py-2 cursor-pointer data-[selected='true']:bg-accent"
          >
            <div className="flex items-center">
                <div
                className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-all",
                    areAllSelected
                    ? "bg-primary text-primary-foreground"
                    : "opacity-50 [&_svg]:invisible"
                )}
                >
                <Check className={cn("h-3 w-3")} />
                </div>
                <span className="font-medium">Chọn tất cả</span>
            </div>
            {areAllSelected && (
                <span className="text-xs text-muted-foreground ml-auto pl-2">
                    ({options.length})
                </span>
            )}
          </CommandItem>
          <CommandSeparator className="my-1" />
        </>
      )}
      
      {/* ----- DANH SÁCH TÙY CHỌN ----- */}
      <div className="max-h-[200px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {options.map((option) => {
            const isSelected = selectedValues.has(option.value)
            return (
            <CommandItem
                key={option.value}
                onSelect={() => {
                    const newSelectedValues = new Set(selectedValues);
                    if (isSelected) {
                        newSelectedValues.delete(option.value)
                    } else {
                        newSelectedValues.add(option.value)
                    }
                    const filterValues = Array.from(newSelectedValues)
                    column?.setFilterValue(
                        filterValues.length ? filterValues : undefined
                    )
                }}
                className="cursor-pointer py-1.5"
            >
                <div
                    className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-colors",
                        isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                >
                    <Check className={cn("h-3 w-3")} />
                </div>
                
                {/* [UI] Hiển thị icon nếu có trong option (nếu option.icon được truyền) */}
                {option.icon && (
                    <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                
                <span className="truncate">{option.label}</span>
                
                {/* [UI] Nếu có count (số lượng), hiển thị ở đây (cần logic đếm từ parent) */}
                {/* {option.count && (
                    <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {option.count}
                    </span>
                )} */}
            </CommandItem>
            )
        })}
      </div>
      
      {selectedValues.size > 0 && (
        <>
          <CommandSeparator className="mt-1" />
          <CommandItem
            onSelect={() => column?.setFilterValue(undefined)}
            className="justify-center text-center text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer mt-1 py-2"
          >
            <MinusCircle className="mr-2 h-3.5 w-3.5" />
            Xóa lọc {title}
          </CommandItem>
        </>
      )}
    </CommandGroup>
  )
}