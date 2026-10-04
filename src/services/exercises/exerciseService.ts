import type { AxiosInstance } from 'axios';
import type { Exercise } from '@/types';

export interface IExerciseService {
    create(topicId: string, params: Partial<Exercise>): Promise<{ data: Exercise }>;
    generateDrafts(topicId: string, form: FormData): Promise<{ data: unknown[] }>;
    list(topicId: string): Promise<{ data: Exercise[] }>;
    update(id: string, params: Partial<Exercise>): Promise<{ data: Exercise }>;
    delete(id: string): Promise<void>;
}

export class ExerciseService implements IExerciseService {
    constructor(private readonly api: AxiosInstance) {}

    async create(topicId: string, params: Partial<Exercise>): Promise<{ data: Exercise }> {
        const { data } = await this.api.post(`/topics/${topicId}/exercises`, params);
        return data;
    }

    async generateDrafts(topicId: string, form: FormData): Promise<{ data: unknown[] }> {
        const { data } = await this.api.post(`/topics/${topicId}/exercise-drafts/ai`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    }

    async list(topicId: string): Promise<{ data: Exercise[] }> {
        const { data } = await this.api.get(`/topics/${topicId}/exercises`);
        return data;
    }

    async update(id: string, params: Partial<Exercise>): Promise<{ data: Exercise }> {
        const { data } = await this.api.put(`/exercises/${id}`, params);
        return data;
    }

    async delete(id: string): Promise<void> {
        await this.api.delete(`/exercises/${id}`);
    }
}
