export interface Task {
  id?: number | string;
  owner?: string;
  priority?: string;
  status: string;
  title?: string;
  description?: string;
  label?: string;
}
