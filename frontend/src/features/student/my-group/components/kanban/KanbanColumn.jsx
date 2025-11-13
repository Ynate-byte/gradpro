import React from 'react';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { KanbanTask } from './KanbanTask';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function KanbanColumn({ column, tasks = [], onTaskClick, onAddTask }) {
    const {
        setNodeRef,
        isOver,
    } = useSortable({
        id: column.ID_COT,
        data: {
            type: 'Column',
            column,
        }
    });

    const taskIds = tasks.map(t => t.ID_CONGVIEC);

    return (
        <div
            ref={setNodeRef}
            className="kanban-column"
        >
            {/* Tiêu đề Cột */}
            <div className="kanban-column-header">
                <div className="flex items-center gap-2">
                    <span>{column.TEN_COT}</span>
                    <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center">
                        {tasks.length}
                    </Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddTask(column.ID_COT)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {/* Danh sách Task */}
            <SortableContext items={taskIds}>
                <div className="kanban-task-list">
                    {tasks.length > 0 ? (
                        tasks.map(task => (
                            <KanbanTask 
                                key={task.ID_CONGVIEC} 
                                task={task} 
                                onClick={() => onTaskClick(task)}
                            />
                        ))
                    ) : (
                        <div className="kanban-task-list-empty">
                            Kéo công việc vào đây
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    );
}