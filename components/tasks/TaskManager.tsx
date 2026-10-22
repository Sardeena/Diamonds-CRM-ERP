'use client';

import React, { useState, useMemo } from 'react';
import { useSuite } from '../../lib/suite-context';
import { Task, TaskPriority, TaskStatus } from '../../types/diamond';
import { Modal } from '../ui/Modal';
import {
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  User,
  AlertCircle,
  Clock,
  Trash2,
  Filter,
  CheckSquare,
} from 'lucide-react';

export function TaskManager() {
  const {
    tasks,
    customers,
    workspaceMembers,
    createTask,
    updateTask,
    toggleTaskStatus,
    deleteTask,
    can,
    activeWorkspace,
  } = useSuite();

  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState(() => ({
    title: '',
    description: '',
    assignedToUserId: '',
    priority: 'medium' as TaskPriority,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    relatedEntityType: 'customer' as Task['relatedEntityType'],
    relatedEntityId: '',
  }));

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesPriority = priorityFilter === 'all' ? true : t.priority === priorityFilter;
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'completed'
          ? t.status === 'completed'
          : t.status !== 'completed';
      return matchesPriority && matchesStatus;
    });
  }, [tasks, priorityFilter, statusFilter]);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      description: '',
      assignedToUserId: workspaceMembers[0]?.userId || '',
      priority: 'medium',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      relatedEntityType: 'customer',
      relatedEntityId: customers[0]?.id || '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    createTask({
      title: formData.title.trim(),
      description: formData.description.trim(),
      assignedToUserId: formData.assignedToUserId,
      priority: formData.priority,
      dueDate: formData.dueDate,
      relatedEntityType: formData.relatedEntityType,
      relatedEntityId: formData.relatedEntityId,
    });
    setIsCreateModalOpen(false);
  };

  const getPriorityStyle = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'medium':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Work & Task Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational milestones, deliverables, and team assignments for {activeWorkspace.name}
          </p>
        </div>

        {can('create_task') && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        {/* Status Filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['pending', 'completed', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
                statusFilter === filter
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <span className="text-[11px] text-slate-400 mr-1">Priority:</span>
          {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors capitalize ${
                priorityFilter === p
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Task List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 px-4">
            <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No tasks in this view</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no tasks matching the selected filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((t) => {
              const isOverdue = t.status !== 'completed' && t.dueDate < today;
              return (
                <div
                  key={t.id}
                  className="p-4 flex items-start gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  {/* Status Toggle Checkbox */}
                  <button
                    onClick={() => toggleTaskStatus(t.id)}
                    disabled={!can('edit_task')}
                    className="mt-0.5 text-slate-400 hover:text-cyan-600 disabled:opacity-50 transition-colors"
                    title={t.status === 'completed' ? 'Mark incomplete' : 'Mark completed'}
                  >
                    {t.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          t.status === 'completed'
                            ? 'text-slate-400 line-through'
                            : 'text-slate-900'
                        }`}
                      >
                        {t.title}
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-xs font-semibold border ${getPriorityStyle(
                          t.priority
                        )}`}
                      >
                        {t.priority}
                      </span>
                      {isOverdue && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Overdue
                        </span>
                      )}
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1 text-slate-600">
                        <User className="w-3 h-3 text-slate-400" />
                        {t.assignedToName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`flex items-center gap-1 font-mono ${
                          isOverdue ? 'text-rose-600 font-medium' : 'text-slate-500'
                        }`}
                      >
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Due {t.dueDate}
                      </span>
                      {t.relatedEntityTitle && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500">{t.relatedEntityTitle}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {can('delete_task') && (
                    <button
                      onClick={() => deleteTask(t.id)}
                      title="Delete task"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Team Task"
        description="Assign a deliverable or operational milestone"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Conduct user interviews for checkout redesign"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Assignee</label>
              <select
                value={formData.assignedToUserId}
                onChange={(e) => setFormData({ ...formData, assignedToUserId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              >
                {workspaceMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.fullName} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Related Client</label>
              <select
                value={formData.relatedEntityId}
                onChange={(e) => setFormData({ ...formData, relatedEntityId: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">No specific account</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Task instructions, links, or acceptance requirements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Save Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
