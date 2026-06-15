import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { practiqApi } from '@/api/request/server'
import { AssignmentService } from '@/services/assignments/assignmentService'
import { useAssignmentStore } from '@/stores/assignmentStore'

export const useAssignment = () => {
  const toast = useToast()
  const service = new AssignmentService(practiqApi)
  const store = useAssignmentStore(service)()
  const { teacherStudents, studentTeachers, myStudents, loading } = storeToRefs(store)

  const assignTeacher = async (teacherId: string, studentId: string) => {
    try {
      return await store.assign(teacherId, studentId)
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo asignar el profesor', life: 3000 })
      throw error
    }
  }

  const unassignTeacher = async (teacherId: string, studentId: string) => {
    try {
      return await store.unassign(teacherId, studentId)
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desvincular el profesor', life: 3000 })
      throw error
    }
  }

  const loadTeacherStudents = async (teacherId: string) => {
    try {
      return await store.fetchStudents(teacherId)
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los alumnos', life: 3000 })
      throw error
    }
  }

  const loadStudentTeachers = async (studentId: string) => {
    try {
      return await store.fetchTeachers(studentId)
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los profesores', life: 3000 })
      throw error
    }
  }

  const loadMyStudents = async () => {
    try {
      return await store.fetchMyStudents()
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los alumnos asignados', life: 3000 })
      throw error
    }
  }

  return {
    teacherStudents,
    studentTeachers,
    myStudents,
    loading,
    assignTeacher,
    unassignTeacher,
    loadTeacherStudents,
    loadStudentTeachers,
    loadMyStudents
  }
}
