export interface ExerciseStepperProps {
    total: number;
    current: number;
    answered: boolean[];
}

export interface ExerciseStepperEmits {
    (event: 'select', index: number): void;
}
