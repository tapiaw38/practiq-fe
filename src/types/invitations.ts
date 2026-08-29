export interface StudentInvitation {
  id: string;
  /** Sin guion, tal como lo espera el backend. */
  code: string;
  /** Con guion, para mostrar en pantalla. */
  formatted_code: string;
  uses: number;
  expires_at: string | null;
  created_at: string;
}

export interface InvitationRedemption {
  teacher_id: string;
  teacher_name: string;
  /** true cuando el alumno ya estaba vinculado con ese docente. */
  already_linked: boolean;
}
