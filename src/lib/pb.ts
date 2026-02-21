import PocketBase from 'pocketbase';

// PocketBase URL - 改成你的服務器地址
export const pb = new PocketBase('http://45.32.100.142:8090');

// Types
export interface Project {
  id: string;
  name: string;
  client?: string;
  start_date?: string;
  end_date?: string;
  status: '進行中' | '已完成' | '暫停';
  budget?: number;
  created: string;
  updated: string;
}

export interface Phase {
  id: string;
  project: string;
  name: string;
  order?: number;
  start_date?: string;
  end_date?: string;
  status: '待處理' | '進行中' | '完成';
  created: string;
  updated: string;
}

export interface Task {
  id: string;
  phase: string;
  name: string;
  assignee?: string;
  start_date?: string;
  end_date?: string;
  status: '待處理' | '進行中' | '完成';
  notes?: string;
  created: string;
  updated: string;
}
