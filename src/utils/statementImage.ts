import type { Exercise } from '@/types';
import { practiqApi } from '@/api/request/server';

const cache = new Map<string, Promise<string>>();

export function statementImageDataURL(
    exercise?: Pick<Exercise, 'id' | 'has_teacher_image'> | null,
): Promise<string> {
    if (!exercise?.id || !exercise.has_teacher_image) return Promise.resolve('');

    const cached = cache.get(exercise.id);
    if (cached) return cached;

    const pending = fetchStatementImage(exercise.id);
    cache.set(exercise.id, pending);
    return pending;
}

export function forgetStatementImage(exerciseId?: string) {
    if (exerciseId) cache.delete(exerciseId);
    else cache.clear();
}

async function fetchStatementImage(exerciseId: string): Promise<string> {
    try {
        const response = await practiqApi.get<Blob>(`/exercises/${exerciseId}/statement-image`, {
            responseType: 'blob',
        });
        if (!response.data?.size) return '';
        return await blobToDataURL(response.data);
    } catch {
        cache.delete(exerciseId);
        return '';
    }
}

function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}
