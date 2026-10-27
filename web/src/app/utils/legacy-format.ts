import { Task } from '../models/task.model';

export function formatTaskLabel(task: Task | null | undefined): string {
  if (!task) {
    return 'SIN-DATOS';
  }
  const priority = task.priority ? task.priority.toUpperCase() : 'NORMAL';
  const owner = task.owner ? task.owner.toUpperCase() : 'SIN-ASIGNAR';
  return priority + ' · ' + owner;
}
