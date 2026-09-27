export interface StudentInvitation {
    id: string;

    code: string;

    formatted_code: string;
    uses: number;
    expires_at: string | null;
    created_at: string;
}

export interface InvitationRedemption {
    teacher_id: string;
    teacher_name: string;

    already_linked: boolean;
}
