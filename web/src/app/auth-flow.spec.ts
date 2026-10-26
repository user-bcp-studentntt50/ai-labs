import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TimeoutError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { LoginRequest, LoginResponse } from './models/auth.models';
import { Task } from './models/task.model';
import { SessionService } from './session.service';
import { TasksService } from './tasks.service';
import { createStorage } from './testing/test-storage';

function createRouter(): Router {
  const router = Object.create(Router.prototype) as Router;
  router.navigate = vi.fn().mockResolvedValue(true);
  return router;
}

function createAuthService(): AuthService {
  return {
    login: vi.fn()
  } as unknown as AuthService;
}

function createDashboard(
  tasksService = { getTasks: vi.fn() },
  session = new SessionService()
): {
  component: DashboardComponent;
  router: Router;
  tasksService: TasksService;
  detectChanges: ReturnType<typeof vi.fn>;
} {
  const router = createRouter();
  const detectChanges = vi.fn();
  const changeDetector = { detectChanges } as unknown as ChangeDetectorRef;
  const zone = { run: (callback: () => void) => callback() } as NgZone;

  return {
    component: new DashboardComponent(
      router,
      changeDetector,
      zone,
      session,
      tasksService as unknown as TasksService
    ),
    router,
    tasksService: tasksService as unknown as TasksService,
    detectChanges
  };
}

describe('authentication and dashboard flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
  });

  it('posts valid credentials through AuthService, saves session and navigates', async () => {
    localStorage.setItem('workshop_preferences', JSON.stringify({ theme: 'dark' }));
    const authService = createAuthService();
    vi.mocked(authService.login).mockResolvedValue({
      token: 'test-token',
      user: { username: 'student', displayName: 'Workshop Student' }
    });
    const router = createRouter();
    const component = new LoginComponent(router, authService, new SessionService());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(authService.login).toHaveBeenCalledWith({
      username: 'student',
      password: 'Workshop123!',
      client: 'angular-workshop'
    } satisfies LoginRequest);
    expect(sessionStorage.getItem('workshop_token')).toBe('test-token');
    expect(JSON.parse(sessionStorage.getItem('workshop_user') ?? '{}')).toEqual({
      username: 'student',
      displayName: 'Workshop Student'
    });
    expect(JSON.parse(localStorage.getItem('workshop_preferences') ?? '{}')).toEqual({
      theme: 'dark',
      showTips: true,
      compact: false
    });
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.busy).toBe(false);
  });

  it('logs in and then loads tasks with the saved session', async () => {
    const session = new SessionService();
    const authService = createAuthService();
    vi.mocked(authService.login).mockResolvedValue({
      token: 'test-token',
      user: { username: 'student' }
    });
    const login = new LoginComponent(createRouter(), authService, session);
    login.username = 'student';
    login.password = 'Workshop123!';

    await login.login();

    const tasksService = {
      getTasks: vi.fn().mockResolvedValue([
        { id: 1, owner: 'student', priority: 'HIGH', status: 'TODO' }
      ])
    };
    const { component: dashboard } = createDashboard(tasksService, session);

    await dashboard.ngOnInit();

    expect(tasksService.getTasks).toHaveBeenCalledWith('student', 'test-token');
    expect(dashboard.visibleTasks.map((task) => task.id)).toEqual([1]);
    expect(dashboard.loading).toBe(false);
  });

  it('shows validation messages and does not authenticate empty credentials', async () => {
    const authService = createAuthService();
    const component = new LoginComponent(createRouter(), authService, new SessionService());

    component.username = '  ';
    await component.login();
    expect(component.message).toBe('Ingrese un usuario.');

    component.username = 'student';
    component.password = '';
    await component.login();
    expect(component.message).toBe('Ingrese una contraseña.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('reports a login response without a token', async () => {
    const authService = createAuthService();
    vi.mocked(authService.login).mockResolvedValue({
      user: { username: 'student' }
    } satisfies LoginResponse);
    const component = new LoginComponent(createRouter(), authService, new SessionService());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(component.message).toBe('El backend respondió sin token.');
    expect(component.busy).toBe(false);
    expect(sessionStorage.getItem('workshop_token')).toBeNull();
  });

  it('uses a generic login error message without echoing user input or backend details', async () => {
    const authService = createAuthService();
    vi.mocked(authService.login).mockRejectedValue(
      new HttpErrorResponse({ status: 401, error: { message: 'internal database error' } })
    );
    const component = new LoginComponent(createRouter(), authService, new SessionService());
    component.username = '<img src=x>';
    component.password = 'wrong';

    await component.login();

    expect(component.message).toBe(
      'No se pudo autenticar. Verifica las credenciales e inténtalo nuevamente.'
    );
    expect(component.message).not.toContain(component.username);
    expect(component.busy).toBe(false);
  });

  it('shows the generic login error when the authentication service is unavailable', async () => {
    const authService = createAuthService();
    vi.mocked(authService.login).mockRejectedValue(
      new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' })
    );
    const component = new LoginComponent(createRouter(), authService, new SessionService());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(component.message).toBe(
      'No se pudo autenticar. Verifica las credenciales e inténtalo nuevamente.'
    );
    expect(component.busy).toBe(false);
    expect(sessionStorage.getItem('workshop_token')).toBeNull();
  });

  it('shows the generic login error when authentication times out', async () => {
    const authService = createAuthService();
    vi.mocked(authService.login).mockRejectedValue(new TimeoutError());
    const component = new LoginComponent(createRouter(), authService, new SessionService());
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(component.message).toBe(
      'No se pudo autenticar. Verifica las credenciales e inténtalo nuevamente.'
    );
    expect(component.busy).toBe(false);
    expect(sessionStorage.getItem('workshop_token')).toBeNull();
  });

  it('rethrows unexpected login failures after resetting the busy state', async () => {
    const authService = createAuthService();
    vi.mocked(authService.login).mockRejectedValue(new Error('unexpected programming error'));
    const component = new LoginComponent(createRouter(), authService, new SessionService());
    component.username = 'student';
    component.password = 'Workshop123!';

    await expect(component.login()).rejects.toThrow('unexpected programming error');
    expect(component.busy).toBe(false);
  });

  it('redirects to login when no token is stored', async () => {
    const { component, router, tasksService } = createDashboard();

    await component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(tasksService.getTasks).not.toHaveBeenCalled();
  });

  it('loads, filters and sorts tasks while preserving the request identity and token', async () => {
    sessionStorage.setItem('workshop_token', 'test-token');
    sessionStorage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
    const tasks: Task[] = [
      { id: 1, owner: 'student', priority: 'LOW', status: 'TODO' },
      { id: 2, owner: 'student', priority: 'HIGH', status: 'IN_PROGRESS' },
      { id: 3, owner: 'student', priority: 'URGENT', status: 'ARCHIVED' }
    ];
    const tasksService = { getTasks: vi.fn().mockResolvedValue(tasks) };
    const { component, tasksService: actualTasksService, detectChanges } = createDashboard(tasksService);

    await component.ngOnInit();

    expect(actualTasksService.getTasks).toHaveBeenCalledWith('student', 'test-token');
    expect(component.visibleTasks.map((task) => task.id)).toEqual([1, 2]);
    expect(component.visibleTasks.map((task) => task.label)).toEqual([
      'LOW · STUDENT',
      'HIGH · STUDENT'
    ]);
    expect(component.tasks).toBe(tasks);
    expect(component.loading).toBe(false);
    expect(detectChanges).toHaveBeenCalledOnce();
  });

  it('shows a generic task error and ends loading', async () => {
    sessionStorage.setItem('workshop_token', 'test-token');
    sessionStorage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
    const tasksService = {
      getTasks: vi.fn().mockRejectedValue(
        new HttpErrorResponse({ status: 500, error: 'private detail' })
      )
    };
    const { component } = createDashboard(tasksService);

    await component.ngOnInit();

    expect(component.error).toBe('No se pudieron cargar las tareas. Intenta nuevamente.');
    expect(component.loading).toBe(false);
  });

  it('shows a generic task error when the server rejects an invalid token', async () => {
    sessionStorage.setItem('workshop_token', 'invalid-token');
    sessionStorage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
    const tasksService = {
      getTasks: vi.fn().mockRejectedValue(
        new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
      )
    };
    const { component, router } = createDashboard(tasksService);

    await component.ngOnInit();

    expect(component.error).toBe('No se pudieron cargar las tareas. Intenta nuevamente.');
    expect(component.loading).toBe(false);
    expect(sessionStorage.getItem('workshop_token')).toBe('invalid-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('reports an unexpected tasks response and rethrows the processing error', async () => {
    sessionStorage.setItem('workshop_token', 'test-token');
    sessionStorage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
    const tasksService = { getTasks: vi.fn().mockResolvedValue(null) };
    const { component } = createDashboard(tasksService);

    await expect(component.ngOnInit()).rejects.toThrow();

    expect(component.error).toBe('No se pudieron cargar las tareas. Intenta nuevamente.');
    expect(component.loading).toBe(false);
  });

  it('rethrows unexpected task failures after clearing loading state', async () => {
    sessionStorage.setItem('workshop_token', 'test-token');
    sessionStorage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
    const tasksService = { getTasks: vi.fn().mockRejectedValue(new Error('unexpected failure')) };
    const { component } = createDashboard(tasksService);

    await expect(component.ngOnInit()).rejects.toThrow('unexpected failure');
    expect(component.error).toBe('No se pudieron cargar las tareas. Intenta nuevamente.');
    expect(component.loading).toBe(false);
  });

  it('removes the session and navigates to login on logout', async () => {
    sessionStorage.setItem('workshop_token', 'test-token');
    sessionStorage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
    localStorage.setItem('workshop_preferences', JSON.stringify({ theme: 'dark' }));
    const { component, router } = createDashboard();

    await component.logout();

    expect(sessionStorage.getItem('workshop_token')).toBeNull();
    expect(sessionStorage.getItem('workshop_user')).toBeNull();
    expect(localStorage.getItem('workshop_preferences')).not.toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('maps task statuses to the observed labels', () => {
    const { component } = createDashboard();

    expect(component.statusLabel('TODO')).toBe('Por hacer');
    expect(component.statusLabel('IN_PROGRESS')).toBe('En progreso');
    expect(component.statusLabel('unknown')).toBe('unknown');
  });
});
