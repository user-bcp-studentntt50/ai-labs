import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticatedUser } from '../models/auth.models';
import { Task } from '../models/task.model';
import { SessionService } from '../session.service';
import { TasksService } from '../tasks.service';
import { formatTaskLabel } from '../utils/legacy-format';
import { isRequestError } from '../utils/request-error';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  tasks: Task[] = [];
  visibleTasks: Task[] = [];
  user: AuthenticatedUser = { username: '' };
  loading = true;
  error = '';

  constructor(
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone,
    private readonly session: SessionService,
    private readonly tasksService: TasksService
  ) {}

  statusLabel(status: string): string {
    return STATUS_LABELS[(status || '').toUpperCase()] || status;
  }

  async ngOnInit(): Promise<void> {
    const token = this.session.getToken();
    this.user = this.session.getUser() ?? { username: '' };
    if (!token) {
      await this.router.navigate(['/login']);
      return;
    }

    try {
      const tasks = await this.tasksService.getTasks(this.user.username, token);
      this.zone.run(() => {
        this.tasks = tasks;
        this.visibleTasks = this.getVisibleTasks(tasks);
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error: unknown) {
      this.zone.run(() => {
        this.error = 'No se pudieron cargar las tareas. Intenta nuevamente.';
        this.loading = false;
        this.cdr.detectChanges();
      });
      if (!isRequestError(error)) {
        throw error;
      }
    }
  }

  async logout(): Promise<void> {
    this.session.clearSession();
    await this.router.navigate(['/login']);
  }

  private getVisibleTasks(tasks: Task[]): Task[] {
    return tasks
      .filter((task) => task.status !== 'ARCHIVED')
      .map((task) => ({ ...task, label: formatTaskLabel(task) }))
      .sort((left, right) => (right.priority ?? '').localeCompare(left.priority ?? ''));
  }
}
