import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_ENDPOINTS } from './config/api.config';
import { Task } from './models/task.model';

@Injectable({ providedIn: 'root' })
export class TasksService {
  constructor(private readonly http: HttpClient) {}

  getTasks(owner: string, token: string): Promise<Task[]> {
    const url = `${API_ENDPOINTS.tasks}?owner=${encodeURIComponent(owner)}`;
    return firstValueFrom(
      this.http.get<Task[]>(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );
  }
}
