import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  Token,
  LoginRequest,
  Team,
  TeamMember,
  Theme,
  ProjectType,
  Project,
  TaskType,
  Task,
  Release,
  GitHubLink,
  PaginatedResponse,
  MessageResponse,
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('token');

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth management
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // ============================================
  // Auth API
  // ============================================
  auth = {
    login: async (data: LoginRequest): Promise<Token> => {
      const response = await this.client.post<Token>('/auth/login', data);
      this.setToken(response.data.access_token);
      return response.data;
    },
    
    me: async (): Promise<User> => {
      const response = await this.client.get<User>('/auth/me');
      return response.data;
    },
  };

  // ============================================
  // Users API
  // ============================================
  users = {
    list: async (page = 1, pageSize = 50): Promise<PaginatedResponse<User>> => {
      const response = await this.client.get<PaginatedResponse<User>>('/users', {
        params: { page, page_size: pageSize },
      });
      return response.data;
    },

    get: async (id: number): Promise<User> => {
      const response = await this.client.get<User>(`/users/${id}`);
      return response.data;
    },

    create: async (data: Partial<User> & { password: string }): Promise<User> => {
      const response = await this.client.post<User>('/users', data);
      return response.data;
    },

    update: async (id: number, data: Partial<User>): Promise<User> => {
      const response = await this.client.patch<User>(`/users/${id}`, data);
      return response.data;
    },

    delete: async (id: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/users/${id}`);
      return response.data;
    },
  };

  // ============================================
  // Teams API
  // ============================================
  teams = {
    list: async (page = 1, pageSize = 50): Promise<PaginatedResponse<Team>> => {
      const response = await this.client.get<PaginatedResponse<Team>>('/teams', {
        params: { page, page_size: pageSize },
      });
      return response.data;
    },

    get: async (id: number): Promise<Team & { members: TeamMember[] }> => {
      const response = await this.client.get<Team & { members: TeamMember[] }>(`/teams/${id}`);
      return response.data;
    },

    create: async (data: Partial<Team>): Promise<Team> => {
      const response = await this.client.post<Team>('/teams', data);
      return response.data;
    },

    update: async (id: number, data: Partial<Team>): Promise<Team> => {
      const response = await this.client.patch<Team>(`/teams/${id}`, data);
      return response.data;
    },

    delete: async (id: number, reassignTasksTo?: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/teams/${id}`, {
        params: reassignTasksTo ? { reassign_tasks_to: reassignTasksTo } : undefined,
      });
      return response.data;
    },

    getStats: async (id: number): Promise<{
      team_id: number;
      team_name: string;
      task_count: number;
      task_type_count: number;
      is_unassigned_team: boolean;
    }> => {
      const response = await this.client.get(`/teams/${id}/stats`);
      return response.data;
    },

    addMember: async (teamId: number, userId: number): Promise<TeamMember> => {
      const response = await this.client.post<TeamMember>(`/teams/${teamId}/members`, { user_id: userId });
      return response.data;
    },

    removeMember: async (teamId: number, userId: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/teams/${teamId}/members/${userId}`);
      return response.data;
    },
  };

  // ============================================
  // Themes API
  // ============================================
  themes = {
    list: async (params?: { include_archived?: boolean }): Promise<PaginatedResponse<Theme>> => {
      const response = await this.client.get<PaginatedResponse<Theme>>('/themes', {
        params: { page: 1, page_size: 50, include_archived: params?.include_archived },
      });
      return response.data;
    },

    get: async (id: number): Promise<Theme & { projects: Array<{ id: number; title: string; status: string }> }> => {
      const response = await this.client.get(`/themes/${id}`);
      return response.data;
    },

    create: async (data: Partial<Theme>): Promise<Theme> => {
      const response = await this.client.post<Theme>('/themes', data);
      return response.data;
    },

    update: async (id: number, data: Partial<Theme>): Promise<Theme> => {
      const response = await this.client.patch<Theme>(`/themes/${id}`, data);
      return response.data;
    },

    delete: async (id: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/themes/${id}`);
      return response.data;
    },
  };

  // ============================================
  // Project Types API
  // ============================================
  projectTypes = {
    list: async (page = 1, pageSize = 50): Promise<PaginatedResponse<ProjectType>> => {
      const response = await this.client.get<PaginatedResponse<ProjectType>>('/project-types', {
        params: { page, page_size: pageSize },
      });
      return response.data;
    },

    get: async (id: number): Promise<ProjectType> => {
      const response = await this.client.get<ProjectType>(`/project-types/${id}`);
      return response.data;
    },

    create: async (data: Partial<ProjectType>): Promise<ProjectType> => {
      const response = await this.client.post<ProjectType>('/project-types', data);
      return response.data;
    },

    update: async (id: number, data: Partial<ProjectType>): Promise<ProjectType> => {
      const response = await this.client.patch<ProjectType>(`/project-types/${id}`, data);
      return response.data;
    },

    delete: async (id: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/project-types/${id}`);
      return response.data;
    },

    getStats: async (id: number): Promise<{
      project_type_id: number;
      project_type_name: string;
      workflow: string[];
      total_projects: number;
      projects_by_status: Record<string, number>;
    }> => {
      const response = await this.client.get(`/project-types/${id}/stats`);
      return response.data;
    },

    migrate: async (
      id: number,
      targetTypeId: number,
      statusMappings: Array<{ old_status: string; new_status: string }>
    ): Promise<MessageResponse> => {
      const response = await this.client.post<MessageResponse>(`/project-types/${id}/migrate`, {
        target_project_type_id: targetTypeId,
        status_mappings: statusMappings,
      });
      return response.data;
    },

    // Field management
    addField: async (
      projectTypeId: number,
      data: {
        key: string;
        label: string;
        field_type: string;
        options?: string[];
        required?: boolean;
        order?: number;
      }
    ) => {
      const response = await this.client.post(`/project-types/${projectTypeId}/fields`, data);
      return response.data;
    },

    updateField: async (
      projectTypeId: number,
      fieldId: number,
      data: {
        label?: string;
        options?: string[];
        required?: boolean;
        order?: number;
      }
    ) => {
      const response = await this.client.patch(`/project-types/${projectTypeId}/fields/${fieldId}`, data);
      return response.data;
    },

    deleteField: async (projectTypeId: number, fieldId: number) => {
      const response = await this.client.delete(`/project-types/${projectTypeId}/fields/${fieldId}`);
      return response.data;
    },
  };

  // ============================================
  // Projects API
  // ============================================
  projects = {
    list: async (filters?: {
      theme_id?: number;
      project_type_id?: number;
      project_type_ids?: number[];
      status?: string;
      statuses?: string[];
      page?: number;
      page_size?: number;
    }): Promise<PaginatedResponse<Project>> => {
      const response = await this.client.get<PaginatedResponse<Project>>('/projects', {
        params: {
          page: filters?.page || 1,
          page_size: filters?.page_size || 50,
          theme_id: filters?.theme_id,
          project_type_id: filters?.project_type_id,
          project_type_ids: filters?.project_type_ids,
          status: filters?.status,
          statuses: filters?.statuses,
        },
        paramsSerializer: {
          indexes: null, // This ensures arrays are serialized as ?statuses=a&statuses=b
        },
      });
      return response.data;
    },

    get: async (id: number): Promise<Project> => {
      const response = await this.client.get<Project>(`/projects/${id}`);
      return response.data;
    },

    create: async (data: Partial<Project>): Promise<Project> => {
      const response = await this.client.post<Project>('/projects', data);
      return response.data;
    },

    update: async (id: number, data: Partial<Project>): Promise<Project> => {
      const response = await this.client.patch<Project>(`/projects/${id}`, data);
      return response.data;
    },

    delete: async (id: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/projects/${id}`);
      return response.data;
    },

    addDependency: async (projectId: number, dependsOnId: number): Promise<MessageResponse> => {
      const response = await this.client.post<MessageResponse>(`/projects/${projectId}/dependencies`, {
        depends_on_id: dependsOnId,
      });
      return response.data;
    },

    removeDependency: async (projectId: number, dependsOnId: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/projects/${projectId}/dependencies/${dependsOnId}`);
      return response.data;
    },
  };

  // ============================================
  // Task Types API
  // ============================================
  taskTypes = {
    list: async (filters?: { team_id?: number }): Promise<PaginatedResponse<TaskType>> => {
      const response = await this.client.get<PaginatedResponse<TaskType>>('/task-types', {
        params: { page: 1, page_size: 50, team_id: filters?.team_id },
      });
      return response.data;
    },

    get: async (id: number): Promise<TaskType> => {
      const response = await this.client.get<TaskType>(`/task-types/${id}`);
      return response.data;
    },

    create: async (teamId: number, data: Partial<TaskType>): Promise<TaskType> => {
      const response = await this.client.post<TaskType>('/task-types', data, {
        params: { team_id: teamId },
      });
      return response.data;
    },

    update: async (id: number, data: Partial<TaskType>): Promise<TaskType> => {
      const response = await this.client.patch<TaskType>(`/task-types/${id}`, data);
      return response.data;
    },

    delete: async (id: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/task-types/${id}`);
      return response.data;
    },

    getStats: async (id: number): Promise<{
      task_type_id: number;
      task_type_name: string;
      team_id: number;
      workflow: string[];
      total_tasks: number;
      tasks_by_status: Record<string, number>;
    }> => {
      const response = await this.client.get(`/task-types/${id}/stats`);
      return response.data;
    },

    migrate: async (
      id: number,
      targetTypeId: number,
      statusMappings: Array<{ old_status: string; new_status: string }>
    ): Promise<MessageResponse> => {
      const response = await this.client.post<MessageResponse>(`/task-types/${id}/migrate`, {
        target_task_type_id: targetTypeId,
        status_mappings: statusMappings,
      });
      return response.data;
    },
  };

  // ============================================
  // Tasks API
  // ============================================
  tasks = {
    list: async (filters?: {
      team_id?: number;
      project_id?: number;
      release_id?: number;
      task_type_id?: number;
      status?: string;
      page?: number;
      page_size?: number;
    }): Promise<PaginatedResponse<Task>> => {
      const response = await this.client.get<PaginatedResponse<Task>>('/tasks', {
        params: {
          page: filters?.page || 1,
          page_size: filters?.page_size || 50,
          team_id: filters?.team_id,
          project_id: filters?.project_id,
          release_id: filters?.release_id,
          task_type_id: filters?.task_type_id,
          status: filters?.status,
        },
      });
      return response.data;
    },

    get: async (id: number): Promise<Task> => {
      const response = await this.client.get<Task>(`/tasks/${id}`);
      return response.data;
    },

    getByDisplayId: async (displayId: string): Promise<Task> => {
      const response = await this.client.get<Task>(`/tasks/by-display-id/${displayId}`);
      return response.data;
    },

    create: async (data: Partial<Task>): Promise<Task> => {
      const response = await this.client.post<Task>('/tasks', data);
      return response.data;
    },

    update: async (id: number, data: Partial<Task>): Promise<Task> => {
      const response = await this.client.patch<Task>(`/tasks/${id}`, data);
      return response.data;
    },

    delete: async (id: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/tasks/${id}`);
      return response.data;
    },

    addDependency: async (taskId: number, dependsOnId: number): Promise<MessageResponse> => {
      const response = await this.client.post<MessageResponse>(`/tasks/${taskId}/dependencies`, {
        depends_on_id: dependsOnId,
      });
      return response.data;
    },

    removeDependency: async (taskId: number, dependsOnId: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/tasks/${taskId}/dependencies/${dependsOnId}`);
      return response.data;
    },
  };

  // ============================================
  // Releases API
  // ============================================
  releases = {
    list: async (filters?: { status?: string }): Promise<PaginatedResponse<Release>> => {
      const response = await this.client.get<PaginatedResponse<Release>>('/releases', {
        params: { page: 1, page_size: 50, status: filters?.status },
      });
      return response.data;
    },

    get: async (id: number): Promise<Release> => {
      const response = await this.client.get<Release>(`/releases/${id}`);
      return response.data;
    },

    create: async (data: Partial<Release>): Promise<Release> => {
      const response = await this.client.post<Release>('/releases', data);
      return response.data;
    },

    update: async (id: number, data: Partial<Release>): Promise<Release> => {
      const response = await this.client.patch<Release>(`/releases/${id}`, data);
      return response.data;
    },

    delete: async (id: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/releases/${id}`);
      return response.data;
    },
  };

  // ============================================
  // GitHub Links API
  // ============================================
  github = {
    getLinks: async (taskId: number): Promise<GitHubLink[]> => {
      const response = await this.client.get<GitHubLink[]>(`/github/links/${taskId}`);
      return response.data;
    },

    addLink: async (taskId: number, data: Partial<GitHubLink>): Promise<GitHubLink> => {
      const response = await this.client.post<GitHubLink>(`/github/links/${taskId}`, data);
      return response.data;
    },

    removeLink: async (taskId: number, linkId: number): Promise<MessageResponse> => {
      const response = await this.client.delete<MessageResponse>(`/github/links/${taskId}/${linkId}`);
      return response.data;
    },
  };

  // Legacy method aliases for backward compatibility
  // TODO: Remove these after all usages are updated
  getCurrentUser = () => this.auth.me();
  login = (data: LoginRequest) => this.auth.login(data);
  addTaskDependency = (taskId: number, dependsOnId: number) => this.tasks.addDependency(taskId, dependsOnId);
  removeTaskDependency = (taskId: number, dependsOnId: number) => this.tasks.removeDependency(taskId, dependsOnId);
  addProjectDependency = (projectId: number, dependsOnId: number) => this.projects.addDependency(projectId, dependsOnId);
  removeProjectDependency = (projectId: number, dependsOnId: number) => this.projects.removeDependency(projectId, dependsOnId);
}

export const api = new ApiClient();