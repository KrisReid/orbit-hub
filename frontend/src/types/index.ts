// User types
export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// Team types
export interface Team {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: number;
  user_id: number;
  team_id: number;
  joined_at: string;
  user: {
    id: number;
    email: string;
    full_name: string;
  };
}

// Theme types
// ThemeStatus is now a string to support custom workflow statuses
export type ThemeStatus = string;

export interface Theme {
  id: number;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// Project types
export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'url' | 'date' | 'checkbox';

export interface ProjectTypeField {
  id: number;
  project_type_id: number;
  key: string;
  label: string;
  field_type: FieldType;
  options: string[] | null;
  required: boolean;
  order: number;
}

export interface ProjectType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  workflow: string[];
  color: string | null;
  created_at: string;
  updated_at: string;
  fields?: ProjectTypeField[];
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  theme_id: number | null;
  project_type_id: number;
  status: string;
  custom_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  theme?: {
    id: number;
    title: string;
    status: ThemeStatus;
  } | null;
  project_type?: {
    id: number;
    name: string;
    slug: string;
    color: string | null;
    workflow?: string[];
    fields?: ProjectTypeField[];
  };
  dependencies?: Array<{ id: number; title: string; status: string }>;
  tasks?: Array<{ id: number; display_id: string; title: string; status: string }>;
}

// Task types
export interface TaskTypeField {
  id: number;
  task_type_id: number;
  key: string;
  label: string;
  field_type: FieldType;
  options: string[] | null;
  required: boolean;
  order: number;
}

export interface TaskType {
  id: number;
  team_id: number;
  name: string;
  slug: string;
  description: string | null;
  workflow: string[];
  color: string | null;
  created_at: string;
  updated_at: string;
  fields?: TaskTypeField[];
}

export interface Task {
  id: number;
  display_id: string;
  title: string;
  description: string | null;
  project_id: number | null;
  team_id: number;
  task_type_id: number;
  release_id: number | null;
  status: string;
  estimation: number | null;
  custom_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  team: {
    id: number;
    name: string;
    slug: string;
  };
  task_type: {
    id: number;
    name: string;
    slug: string;
    color: string | null;
  };
  project?: {
    id: number;
    title: string;
    status: string;
  } | null;
  release?: {
    id: number;
    version: string;
    title: string;
    status: ReleaseStatus;
  } | null;
  dependencies?: Array<{ id: number; display_id: string; title: string; status: string }>;
  github_links?: GitHubLink[];
}

// Release types
export type ReleaseStatus = 'planned' | 'in_progress' | 'released' | 'cancelled';

export interface Release {
  id: number;
  version: string;
  title: string;
  description: string | null;
  target_date: string | null;
  release_date: string | null;
  status: ReleaseStatus;
  created_at: string;
  updated_at: string;
  tasks?: Array<{ id: number; display_id: string; title: string; status: string }>;
}

// GitHub types
export type GitHubLinkType = 'pull_request' | 'branch' | 'commit';
export type GitHubPRStatus = 'open' | 'closed' | 'merged' | 'draft';

export interface GitHubLink {
  id: number;
  task_id: number;
  link_type: GitHubLinkType;
  repository_owner: string;
  repository_name: string;
  pr_number: number | null;
  pr_title: string | null;
  pr_status: GitHubPRStatus | null;
  branch_name: string | null;
  commit_sha: string | null;
  url: string;
  created_at: string;
  updated_at: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// API Response
export interface MessageResponse {
  message: string;
  success: boolean;
}
