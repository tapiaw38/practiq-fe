import type { Student } from '@/types';

export interface StudentsListProps {
    students: Student[];
}

export interface StudentsListEmits {
    (e: 'invite'): void;
}
