import { HttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NEVER, of } from 'rxjs';
import { API_ENDPOINTS, REQUEST_TIMEOUT_MS } from './config/api.config';
import { AuthService } from './auth.service';
import { LoginRequest, LoginResponse } from './models/auth.models';
import { Task } from './models/task.model';
import { SessionService } from './session.service';
import { TasksService } from './tasks.service';
import { createStorage } from './testing/test-storage';

describe('AuthService', () => {
  it('posts the observed login request with the configured timeout', async () => {
    const response: LoginResponse = {
      token: 'test-token',
      user: { username: 'student' }
    };
    const post = vi.fn().mockReturnValue(of(response));
    const http = { post } as unknown as HttpClient;
    const service = new AuthService(http);
    const request: LoginRequest = {
      username: 'student',
      password: 'Workshop123!',
      client: 'angular-workshop'
    };

    await expect(service.login(request)).resolves.toEqual(response);
    expect(post).toHaveBeenCalledWith(API_ENDPOINTS.login, request);
    expect(REQUEST_TIMEOUT_MS).toBe(5000);
  });

  it('rejects a login request that exceeds the observed timeout', async () => {
    const post = vi.fn().mockReturnValue(NEVER);
    const service = new AuthService({ post } as unknown as HttpClient);
    const request: LoginRequest = {
      username: 'student',
      password: 'Workshop123!',
      client: 'angular-workshop'
    };
    vi.useFakeTimers();
    try {
      const pendingLogin = service.login(request);
      const timeoutExpectation = expect(pendingLogin).rejects.toThrow();

      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      await timeoutExpectation;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('TasksService', () => {
  it('requests tasks with the observed owner query and bearer token', async () => {
    const response: Task[] = [{ id: 1, status: 'TODO', owner: 'student' }];
    const get = vi.fn().mockReturnValue(of(response));
    const http = { get } as unknown as HttpClient;
    const service = new TasksService(http);

    await expect(service.getTasks('student', 'test-token')).resolves.toEqual(response);
    expect(get).toHaveBeenCalledWith(`${API_ENDPOINTS.tasks}?owner=student`, {
      headers: { Authorization: 'Bearer test-token' }
    });
  });

  it('encodes owner values when building the tasks query', async () => {
    const get = vi.fn().mockReturnValue(of([]));
    const service = new TasksService({ get } as unknown as HttpClient);

    await service.getTasks('student+test', 'test-token');

    expect(get).toHaveBeenCalledWith(`${API_ENDPOINTS.tasks}?owner=student%2Btest`, {
      headers: { Authorization: 'Bearer test-token' }
    });
  });
});

describe('SessionService', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
    vi.restoreAllMocks();
  });

  it('stores authentication details for the current tab rather than persistent local storage', () => {
    const service = new SessionService();
    service.saveSession({
      token: 'test-token',
      user: { username: 'student', displayName: 'Workshop Student' }
    });

    expect(service.getToken()).toBe('test-token');
    expect(service.getUser()).toEqual({
      username: 'student',
      displayName: 'Workshop Student'
    });
    expect(localStorage.getItem('workshop_token')).toBeNull();
    expect(localStorage.getItem('workshop_user')).toBeNull();
  });

  it('merges stored preferences with defaults and preserves them when clearing a session', () => {
    localStorage.setItem('workshop_preferences', JSON.stringify({ theme: 'dark' }));
    const service = new SessionService();
    service.saveSession({ token: 'test-token', user: { username: 'student' } });

    expect(service.getPreferences()).toEqual({
      theme: 'dark',
      showTips: true,
      compact: false
    });

    service.clearSession();

    expect(service.getToken()).toBeNull();
    expect(service.getUser()).toBeNull();
    expect(localStorage.getItem('workshop_preferences')).not.toBeNull();
  });

  it('returns default preferences and warns when stored JSON is invalid', () => {
    localStorage.setItem('workshop_preferences', '{invalid');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const service = new SessionService();

    expect(service.getPreferences()).toEqual({
      theme: 'light',
      showTips: true,
      compact: false
    });
    expect(warning).toHaveBeenCalledOnce();
  });

  it('ignores stored preference values with unexpected types', () => {
    localStorage.setItem(
      'workshop_preferences',
      JSON.stringify({ theme: [], showTips: 'yes', compact: 1 })
    );
    const service = new SessionService();

    expect(service.getPreferences()).toEqual({
      theme: 'light',
      showTips: true,
      compact: false
    });
  });

  it('returns no user and warns when stored session JSON is invalid', () => {
    sessionStorage.setItem('workshop_user', '{invalid');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const service = new SessionService();

    expect(service.getUser()).toBeNull();
    expect(warning).toHaveBeenCalledOnce();
  });
});

describe('test storage helper', () => {
  it('supports storage key enumeration, length and clearing', () => {
    const storage = createStorage();
    storage.setItem('first', 'one');
    storage.setItem('second', 'two');

    expect(storage.length).toBe(2);
    expect(storage.key(0)).toBe('first');
    expect(storage.key(1)).toBe('second');
    expect(storage.key(2)).toBeNull();

    storage.clear();

    expect(storage.length).toBe(0);
  });
});
