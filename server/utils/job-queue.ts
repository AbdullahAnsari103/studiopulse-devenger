/**
 * Editor Job Queue
 * 
 * Simple in-memory job queue for long-running editor operations.
 * Abstracted so it can later be swapped for Redis/BullMQ without changing
 * the frontend or route logic.
 */

import { EventEmitter } from 'events';

export type JobType = 'transcribe' | 'analyze' | 'render' | 'export' | 'ai_command';
export type JobStatus = 'pending' | 'processing' | 'complete' | 'error' | 'cancelled';

export interface Job {
  id: string;
  projectId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  message: string;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

class JobQueue extends EventEmitter {
  private jobs = new Map<string, Job>();

  create(projectId: string, type: JobType): Job {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const job: Job = {
      id,
      projectId,
      type,
      status: 'pending',
      progress: 0,
      message: 'Queued…',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(id, job);
    return job;
  }

  update(id: string, updates: Partial<Pick<Job, 'status' | 'progress' | 'message' | 'result' | 'error'>>) {
    const job = this.jobs.get(id);
    if (!job) return;
    const updated = { ...job, ...updates, updatedAt: new Date().toISOString() };
    this.jobs.set(id, updated);
    this.emit('update', updated);
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getByProject(projectId: string): Job[] {
    return Array.from(this.jobs.values()).filter(j => j.projectId === projectId);
  }

  all(): Job[] {
    return Array.from(this.jobs.values());
  }
}

export const jobQueue = new JobQueue();
