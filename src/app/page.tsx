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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { differenceInDays } from 'date-fns';

// Task Card Component
function TaskCard({ task, onDelete }: { task: Task; onDelete: (id: string) => void }) {
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
      className={`p-3 mb-2 rounded-lg border ${statusColors[task.status]} shadow-sm cursor-move group`}
    >
      <div className="font-medium text-sm flex justify-between items-start">
        <span>{task.name}</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
        >
          ✕
        </button>
      </div>
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
  onAddTask,
  onDeleteTask,
}: {
  title: string;
  tasks: Task[];
  status: Task['status'];
  onDragEnd: (event: DragEndEvent) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  onAddTask: (status: Task['status']) => void;
  onDeleteTask: (id: string) => void;
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
      <h3 className="font-bold text-gray-700 mb-4 flex items-center justify-between">
        {title} <span className="text-sm text-gray-400">({filteredTasks.length})</span>
      </h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
      </DndContext>
      <button
        onClick={() => onAddTask(status)}
        className="w-full mt-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
      >
        + 新增任務
      </button>
    </div>
  );
}

// Add Task Modal
function AddTaskModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  phases,
  defaultStatus
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (task: { name: string; phase: string; status: Task['status']; assignee?: string }) => void;
  phases: Phase[];
  defaultStatus: Task['status'];
}) {
  const [name, setName] = useState('');
  const [phase, setPhase] = useState(phases[0]?.id || '');
  const [status, setStatus] = useState<Task['status']>(defaultStatus);
  const [assignee, setAssignee] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-bold mb-4">新增任務</h3>
        <input
          type="text"
          placeholder="任務名稱"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
        />
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
        >
          {phases.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Task['status'])}
          className="w-full border rounded px-3 py-2 mb-3"
        >
          <option value="待處理">待處理</option>
          <option value="進行中">進行中</option>
          <option value="完成">完成</option>
        </select>
        <input
          type="text"
          placeholder="負責人（可選）"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">取消</button>
          <button 
            onClick={() => { onSubmit({ name, phase, status, assignee }); setName(''); setAssignee(''); }}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            新增
          </button>
        </div>
      </div>
    </div>
  );
}

// Gantt Chart Component
function GanttChart({ tasks, phases }: { tasks: Task[]; phases: Phase[] }) {
  const allDates = tasks.flatMap((t) => [t.start_date, t.end_date]).filter(Boolean) as string[];
  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => new Date(d).getTime()))) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => new Date(d).getTime()))) : new Date();
  
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

  return (
    <div className="overflow-x-auto bg-white rounded-lg p-4">
      <div className="min-w-[800px]">
        <div className="flex border-b pb-2 mb-4">
          <div className="w-40 flex-shrink-0 font-bold">任務</div>
          <div className="flex-1 flex">
            {Array.from({ length: Math.min(days, 60) }).map((_, i) => {
              const date = new Date(startDate);
              date.setDate(date.getDate() + i);
              return (
                <div key={i} className="text-xs text-gray-400 text-center" style={{ width: 40 }}>
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        </div>

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
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTaskStatus, setAddTaskStatus] = useState<Task['status']>('待處理');

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

  const currentPhases = phases.filter((p) => p.project === selectedProject);
  const currentPhaseIds = currentPhases.map((p) => p.id);
  const currentTasks = tasks.filter((t) => currentPhaseIds.includes(t.phase));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];

    try {
      await pb.collection('tasks').update(taskId, { status: newStatus });
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }

  async function handleStatusChange(id: string, status: Task['status']) {
    try {
      await pb.collection('tasks').update(id, { status });
      setTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }

  async function handleAddTask(task: { name: string; phase: string; status: Task['status']; assignee?: string }) {
    try {
      const newTask = await pb.collection('tasks').create({
        name: task.name,
        phase: task.phase,
        status: task.status,
        assignee: task.assignee || '',
      });
      setTasks([...tasks, newTask as unknown as Task]);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }

  async function handleDeleteTask(id: string) {
    if (!confirm('確定要刪除這個任務嗎？')) return;
    try {
      await pb.collection('tasks').delete(id);
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Error deleting task:', error);
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
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">工程專案管理</h1>
          <div className="flex items-center gap-4">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="border rounded px-3 py-2"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

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

      <main className="p-6">
        {currentPhases.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            請先在 Admin UI 建立「階段」資料
            <br />
            <a href="http://45.32.100.142:8090/_/" target="_blank" className="text-blue-500 underline">
              開啟 Admin UI
            </a>
          </div>
        ) : view === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto">
            <KanbanColumn
              title="待處理"
              tasks={currentTasks}
              status="待處理"
              onDragEnd={handleDragEnd}
              onStatusChange={handleStatusChange}
              onAddTask={(status) => { setAddTaskStatus(status); setShowAddModal(true); }}
              onDeleteTask={handleDeleteTask}
            />
            <KanbanColumn
              title="進行中"
              tasks={currentTasks}
              status="進行中"
              onDragEnd={handleDragEnd}
              onStatusChange={handleStatusChange}
              onAddTask={(status) => { setAddTaskStatus(status); setShowAddModal(true); }}
              onDeleteTask={handleDeleteTask}
            />
            <KanbanColumn
              title="完成"
              tasks={currentTasks}
              status="完成"
              onDragEnd={handleDragEnd}
              onStatusChange={handleStatusChange}
              onAddTask={(status) => { setAddTaskStatus(status); setShowAddModal(true); }}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        ) : (
          <GanttChart tasks={currentTasks} phases={currentPhases} />
        )}
      </main>

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddTask}
        phases={currentPhases}
        defaultStatus={addTaskStatus}
      />
    </div>
  );
}
