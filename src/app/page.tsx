'use client';

import { useState, useEffect } from 'react';
import { pb, Project, Phase, Task } from '@/lib/pb';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, differenceInDays, parseISO } from 'date-fns';

// Task Card Component
function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (id: string, status: Task['status']) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusColors = {
    '待處理': 'bg-gray-100 border-gray-300',
    '進行中': 'bg-blue-100 border-blue-300',
    '完成': 'bg-green-100 border-green-300',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 mb-2 rounded-lg border ${statusColors[task.status]} shadow-sm cursor-move`}
    >
      <div className="font-medium text-sm">{task.name}</div>
      {task.assignee && (
        <div className="text-xs text-gray-500 mt-1">👤 {task.assignee}</div>
      )}
      {task.start_date && task.end_date && (
        <div className="text-xs text-gray-400 mt-1">
          📅 {task.start_date} ~ {task.end_date}
        </div>
      )}
    </div>
  );
}

// Kanban Column
function KanbanColumn({
  title,
  tasks,
  status,
  onDragEnd,
  onStatusChange,
}: {
  title: string;
  tasks: Task[];
  status: Task['status'];
  onDragEnd: (event: DragEndEvent) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredTasks = tasks.filter((t) => t.status === status);

  return (
    <div className="flex-1 min-w-[250px] bg-gray-50 rounded-lg p-4">
      <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
        {title} <span className="text-sm text-gray-400">({filteredTasks.length})</span>
      </h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

// Gantt Chart Component
function GanttChart({ tasks, phases }: { tasks: Task[]; phases: Phase[] }) {
  // 找出日期範圍
  const allDates = tasks.flatMap((t) => [t.start_date, t.end_date]).filter(Boolean) as string[];
  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => new Date(d).getTime()))) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => new Date(d).getTime()))) : new Date();
  
  // 至少顯示 30 天
  const startDate = new Date(minDate);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(maxDate);
  endDate.setDate(endDate.getDate() + 14);
  
  const days = differenceInDays(endDate, startDate) + 1;

  const getPosition = (start?: string, end?: string) => {
    if (!start || !end) return { left: 0, width: 0 };
    const startD = new Date(start);
    const endD = new Date(end);
    const left = differenceInDays(startD, startDate) * 40;
    const width = Math.max(differenceInDays(endD, startD) * 40, 40);
    return { left, width };
  };

  const getPhaseName = (phaseId: string) => {
    const phase = phases.find((p) => p.id === phaseId);
    return phase?.name || '未知階段';
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg p-4">
      <div className="min-w-[800px]">
        {/* 日期表頭 */}
        <div className="flex border-b pb-2 mb-4">
          <div className="w-40 flex-shrink-0 font-bold">任務</div>
          <div className="flex-1 flex">
            {Array.from({ length: Math.min(days, 60) }).map((_, i) => {
              const date = new Date(startDate);
              date.setDate(date.getDate() + i);
              return (
                <div
                  key={i}
                  className="text-xs text-gray-400 text-center"
                  style={{ width: 40 }}
                >
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        </div>

        {/* 任務列表 */}
        {tasks.map((task) => {
          const { left, width } = getPosition(task.start_date, task.end_date);
          const statusColors = {
            '待處理': 'bg-gray-300',
            '進行中': 'bg-blue-500',
            '完成': 'bg-green-500',
          };
          return (
            <div key={task.id} className="flex items-center mb-3">
              <div className="w-40 flex-shrink-0 text-sm truncate pr-2">{task.name}</div>
              <div className="flex-1 relative h-6">
                {task.start_date && task.end_date && (
                  <div
                    className={`absolute h-5 rounded ${statusColors[task.status]} text-white text-xs flex items-center px-2`}
                    style={{ left: `${left}px`, width: `${width}px`, top: 2 }}
                  >
                    {task.name}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Main Component
export default function Home() {
  const [view, setView] = useState<'kanban' | 'gantt'>('kanban');
  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // 載入資料
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [projectsData, phasesData, tasksData] = await Promise.all([
        pb.collection('projects').getFullList<Project>(),
        pb.collection('phases').getFullList<Phase>(),
        pb.collection('tasks').getFullList<Task>(),
      ]);
      setProjects(projectsData);
      setPhases(phasesData);
      setTasks(tasksData);
      if (projectsData.length > 0) {
        setSelectedProject(projectsData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // 篩選當前專案的階段和任務
  const currentPhases = phases.filter((p) => p.project === selectedProject);
  const currentPhaseIds = currentPhases.map((p) => p.id);
  const currentTasks = tasks.filter((t) => currentPhaseIds.includes(t.phase));

  // 處理拖曳
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];

    // 更新任務狀態
    try {
      await pb.collection('tasks').update(taskId, { status: newStatus });
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }

  // 快速改變狀態
  async function handleStatusChange(id: string, status: Task['status']) {
    try {
      await pb.collection('tasks').update(id, { status });
      setTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">工程專案管理</h1>
          <div className="flex items-center gap-4">
            {/* 專案選擇 */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="border rounded px-3 py-2"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* 視圖切換 */}
            <div className="flex border rounded overflow-hidden">
              <button
                onClick={() => setView('kanban')}
                className={`px-4 py-2 ${view === 'kanban' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              >
                Kanban
              </button>
              <button
                onClick={() => setView('gantt')}
                className={`px-4 py-2 ${view === 'gantt' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              >
                Gantt
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        {view === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto">
            <KanbanColumn
              title="待處理"
              tasks={currentTasks}
              status="待處理"
              onDragEnd={handleDragEnd}
              onStatusChange={handleStatusChange}
            />
            <KanbanColumn
              title="進行中"
              tasks={currentTasks}
              status="進行中"
              onDragEnd={handleDragEnd}
              onStatusChange={handleStatusChange}
            />
            <KanbanColumn
              title="完成"
              tasks={currentTasks}
              status="完成"
              onDragEnd={handleDragEnd}
              onStatusChange={handleStatusChange}
            />
          </div>
        ) : (
          <GanttChart tasks={currentTasks} phases={currentPhases} />
        )}
      </main>
    </div>
  );
}
