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

  // Auth
  async login(data: LoginRequest): Promise<Token> {
    const response = await this.client.post<Token>('/auth/login', data);
    this.setToken(response.data.access_token);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  // Users
  async getUsers(page = 1, pageSize = 50): Promise<PaginatedResponse<User>> {
    const response = await this.client.get<PaginatedResponse<User>>('/users', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  async createUser(data: Partial<User> & { password: string }): Promise<User> {
    const response = await this.client.post<User>('/users', data);
    return response.data;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const response = await this.client.patch<User>(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/users/${id}`);
    return response.data;
  }

  // Teams
  async getTeams(page = 1, pageSize = 50): Promise<PaginatedResponse<Team>> {
    const response = await this.client.get<PaginatedResponse<Team>>('/teams', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  async getTeam(id: number): Promise<Team & { members: TeamMember[] }> {
    const response = await this.client.get<Team & { members: TeamMember[] }>(`/teams/${id}`);
    return response.data;
  }

  async createTeam(data: Partial<Team>): Promise<Team> {
    const response = await this.client.post<Team>('/teams', data);
    return response.data;
  }

  async updateTeam(id: number, data: Partial<Team>): Promise<Team> {
    const response = await this.client.patch<Team>(`/teams/${id}`, data);
    return response.data;
  }

  async deleteTeam(id: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/teams/${id}`);
    return response.data;
  }

  async addTeamMember(teamId: number, userId: number): Promise<TeamMember> {
    const response = await this.client.post<TeamMember>(`/teams/${teamId}/members`, { user_id: userId });
    return response.data;
  }

  async removeTeamMember(teamId: number, userId: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/teams/${teamId}/members/${userId}`);
    return response.data;
  }

  // Themes
  async getThemes(page = 1, pageSize = 50, includeArchived = false): Promise<PaginatedResponse<Theme>> {
    const response = await this.client.get<PaginatedResponse<Theme>>('/themes', {
      params: { page, page_size: pageSize, include_archived: includeArchived },
    });
    return response.data;
  }

  async getTheme(id: number): Promise<Theme & { projects: Array<{ id: number; title: string; status: string }> }> {
    const response = await this.client.get(`/themes/${id}`);
    return response.data;
  }

  async createTheme(data: Partial<Theme>): Promise<Theme> {
    const response = await this.client.post<Theme>('/themes', data);
    return response.data;
  }

  async updateTheme(id: number, data: Partial<Theme>): Promise<Theme> {
    const response = await this.client.patch<Theme>(`/themes/${id}`, data);
    return response.data;
  }

  async deleteTheme(id: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/themes/${id}`);
    return response.data;
  }

  // Project Types
  async getProjectTypes(page = 1, pageSize = 50): Promise<PaginatedResponse<ProjectType>> {
    const response = await this.client.get<PaginatedResponse<ProjectType>>('/project-types', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  async getProjectType(id: number): Promise<ProjectType> {
    const response = await this.client.get<ProjectType>(`/project-types/${id}`);
    return response.data;
  }

  async createProjectType(data: Partial<ProjectType>): Promise<ProjectType> {
    const response = await this.client.post<ProjectType>('/project-types', data);
    return response.data;
  }

  async updateProjectType(id: number, data: Partial<ProjectType>): Promise<ProjectType> {
    const response = await this.client.patch<ProjectType>(`/project-types/${id}`, data);
    return response.data;
  }

  async deleteProjectType(id: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/project-types/${id}`);
    return response.data;
  }

  // Projects
  async getProjects(
    page = 1,
    pageSize = 50,
    filters?: { theme_id?: number; project_type_id?: number; status?: string }
  ): Promise<PaginatedResponse<Project>> {
    const response = await this.client.get<PaginatedResponse<Project>>('/projects', {
      params: { page, page_size: pageSize, ...filters },
    });
    return response.data;
  }

  async getProject(id: number): Promise<Project> {
    const response = await this.client.get<Project>(`/projects/${id}`);
    return response.data;
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const response = await this.client.post<Project>('/projects', data);
    return response.data;
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    const response = await this.client.patch<Project>(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/projects/${id}`);
    return response.data;
  }

  async addProjectDependency(projectId: number, dependsOnId: number): Promise<MessageResponse> {
    const response = await this.client.post<MessageResponse>(`/projects/${projectId}/dependencies`, {
      depends_on_id: dependsOnId,
    });
    return response.data;
  }

  async removeProjectDependency(projectId: number, dependsOnId: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/projects/${projectId}/dependencies/${dependsOnId}`);
    return response.data;
  }

  // Task Types
  async getTaskTypes(page = 1, pageSize = 50, teamId?: number): Promise<PaginatedResponse<TaskType>> {
    const response = await this.client.get<PaginatedResponse<TaskType>>('/task-types', {
      params: { page, page_size: pageSize, team_id: teamId },
    });
    return response.data;
  }

  async getTaskType(id: number): Promise<TaskType> {
    const response = await this.client.get<TaskType>(`/task-types/${id}`);
    return response.data;
  }

  async createTaskType(teamId: number, data: Partial<TaskType>): Promise<TaskType> {
    const response = await this.client.post<TaskType>('/task-types', data, {
      params: { team_id: teamId },
    });
    return response.data;
  }

  async updateTaskType(id: number, data: Partial<TaskType>): Promise<TaskType> {
    const response = await this.client.patch<TaskType>(`/task-types/${id}`, data);
    return response.data;
  }

  async deleteTaskType(id: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/task-types/${id}`);
    return response.data;
  }

  // Tasks
  async getTasks(
    page = 1,
    pageSize = 50,
    filters?: { team_id?: number; project_id?: number; release_id?: number; task_type_id?: number; status?: string }
  ): Promise<PaginatedResponse<Task>> {
    const response = await this.client.get<PaginatedResponse<Task>>('/tasks', {
      params: { page, page_size: pageSize, ...filters },
    });
    return response.data;
  }

  async getTask(id: number): Promise<Task> {
    const response = await this.client.get<Task>(`/tasks/${id}`);
    return response.data;
  }

  async getTaskByDisplayId(displayId: string): Promise<Task> {
    const response = await this.client.get<Task>(`/tasks/by-display-id/${displayId}`);
    return response.data;
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    const response = await this.client.post<Task>('/tasks', data);
    return response.data;
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    const response = await this.client.patch<Task>(`/tasks/${id}`, data);
    return response.data;
  }

  async deleteTask(id: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/tasks/${id}`);
    return response.data;
  }

  async addTaskDependency(taskId: number, dependsOnId: number): Promise<MessageResponse> {
    const response = await this.client.post<MessageResponse>(`/tasks/${taskId}/dependencies`, {
      depends_on_id: dependsOnId,
    });
    return response.data;
  }

  async removeTaskDependency(taskId: number, dependsOnId: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/tasks/${taskId}/dependencies/${dependsOnId}`);
    return response.data;
  }

  // Releases
  async getReleases(page = 1, pageSize = 50, status?: string): Promise<PaginatedResponse<Release>> {
    const response = await this.client.get<PaginatedResponse<Release>>('/releases', {
      params: { page, page_size: pageSize, status },
    });
    return response.data;
  }

  async getRelease(id: number): Promise<Release> {
    const response = await this.client.get<Release>(`/releases/${id}`);
    return response.data;
  }

  async createRelease(data: Partial<Release>): Promise<Release> {
    const response = await this.client.post<Release>('/releases', data);
    return response.data;
  }

  async updateRelease(id: number, data: Partial<Release>): Promise<Release> {
    const response = await this.client.patch<Release>(`/releases/${id}`, data);
    return response.data;
  }

  async deleteRelease(id: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/releases/${id}`);
    return response.data;
  }

  // GitHub Links
  async getTaskGitHubLinks(taskId: number): Promise<GitHubLink[]> {
    const response = await this.client.get<GitHubLink[]>(`/github/links/${taskId}`);
    return response.data;
  }

  async addGitHubLink(taskId: number, data: Partial<GitHubLink>): Promise<GitHubLink> {
    const response = await this.client.post<GitHubLink>(`/github/links/${taskId}`, data);
    return response.data;
  }

  async removeGitHubLink(taskId: number, linkId: number): Promise<MessageResponse> {
    const response = await this.client.delete<MessageResponse>(`/github/links/${taskId}/${linkId}`);
    return response.data;
  }
  // Namespace-based API for pages
  themes = {
    list: (params?: { include_archived?: boolean }) =>
      this.getThemes(1, 50, params?.include_archived),
    get: (id: number) => this.getTheme(id),
    create: (data: Partial<Theme>) => this.createTheme(data),
    update: (id: number, data: Partial<Theme>) => this.updateTheme(id, data),
    delete: (id: number) => this.deleteTheme(id),
  };

  projects = {
    list: (filters?: { project_type_id?: number; status?: string; page?: number; page_size?: number }) =>
      this.getProjects(filters?.page || 1, filters?.page_size || 50, filters),
    get: (id: number) => this.getProject(id),
    create: (data: Partial<Project>) => this.createProject(data),
    update: (id: number, data: Partial<Project>) => this.updateProject(id, data),
    delete: (id: number) => this.deleteProject(id),
  };

  projectTypes = {
    list: () => this.getProjectTypes(),
    get: (id: number) => this.getProjectType(id),
    create: (data: Partial<ProjectType>) => this.createProjectType(data),
    update: (id: number, data: Partial<ProjectType>) => this.updateProjectType(id, data),
    delete: (id: number) => this.deleteProjectType(id),
  };

  tasks = {
    list: (filters?: { team_id?: number; project_id?: number; release_id?: number; status?: string; page?: number; page_size?: number }) =>
      this.getTasks(filters?.page || 1, filters?.page_size || 50, filters),
    get: (id: number) => this.getTask(id),
    create: (data: Partial<Task>) => this.createTask(data),
    update: (id: number, data: Partial<Task>) => this.updateTask(id, data),
    delete: (id: number) => this.deleteTask(id),
  };

  taskTypes = {
    list: (filters?: { team_id?: number }) =>
      this.getTaskTypes(1, 50, filters?.team_id),
    get: (id: number) => this.getTaskType(id),
    create: (teamId: number, data: Partial<TaskType>) => this.createTaskType(teamId, data),
    update: (id: number, data: Partial<TaskType>) => this.updateTaskType(id, data),
    delete: (id: number) => this.deleteTaskType(id),
  };

  releases = {
    list: (filters?: { status?: string }) =>
      this.getReleases(1, 50, filters?.status),
    get: (id: number) => this.getRelease(id),
    create: (data: Partial<Release>) => this.createRelease(data),
    update: (id: number, data: Partial<Release>) => this.updateRelease(id, data),
    delete: (id: number) => this.deleteRelease(id),
  };

  teams = {
    list: () => this.getTeams(),
    get: (id: number) => this.getTeam(id),
    create: (data: Partial<Team>) => this.createTeam(data),
    update: (id: number, data: Partial<Team>) => this.updateTeam(id, data),
    delete: (id: number) => this.deleteTeam(id),
  };
}

export const api = new ApiClient();
