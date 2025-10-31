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
  const selectedValues = new Set(column?.getFilterValue())

  if (!column) return null;

  return (
    <CommandGroup heading={title} className={cn("p-1", className)}>
      {options.map((option) => {
        const isSelected = selectedValues.has(option.value)
        return (
          <CommandItem
            key={option.value}
            onSelect={() => {
              if (isSelected) {
                selectedValues.delete(option.value)
              } else {
                selectedValues.add(option.value)
              }
              const filterValues = Array.from(selectedValues)
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