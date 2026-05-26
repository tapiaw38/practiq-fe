import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/api/request/server'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => {
        const token = getToken()
        if (!token) return '/login'
        return '/dashboard'
      }
    },
    {
      path: '/dashboard',
      redirect: () => {
        try {
          const profileStr = localStorage.getItem('practiq_profile')
          if (profileStr) {
            const profile = JSON.parse(profileStr)
            if (profile.profile_type === 'teacher') return '/teacher/dashboard'
            return '/student/dashboard'
          }
        } catch {}
        return '/student/dashboard'
      }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/teacher/dashboard',
      name: 'teacher-dashboard',
      component: () => import('@/views/teacher/DashboardView.vue'),
      meta: { requiresAuth: true, profileType: 'teacher' }
    },
    {
      path: '/teacher/admin/users',
      name: 'teacher-admin-users',
      component: () => import('@/views/teacher/AdminUsersView.vue'),
      meta: { requiresAuth: true, profileType: 'teacher' }
    },
    {
      path: '/teacher/admin/academic',
      name: 'teacher-admin-academic',
      component: () => import('@/views/teacher/AcademicAdminView.vue'),
      meta: { requiresAuth: true, profileType: 'teacher' }
    },
    {
      path: '/teacher/admin/academic/subjects/:subjectId/courses',
      name: 'teacher-subject-courses',
      component: () => import('@/views/teacher/SubjectCoursesView.vue'),
      meta: { requiresAuth: true, profileType: 'teacher' }
    },
    {
      path: '/teacher/courses/:id',
      name: 'teacher-course',
      component: () => import('@/views/teacher/CourseDetailView.vue'),
      meta: { requiresAuth: true, profileType: 'teacher' }
    },
    {
      path: '/student/dashboard',
      name: 'student-dashboard',
      component: () => import('@/views/student/DashboardView.vue'),
      meta: { requiresAuth: true, profileType: 'student' }
    },
    {
      path: '/student/practice/:id',
      name: 'student-practice',
      component: () => import('@/views/student/PracticeView.vue'),
      meta: { requiresAuth: true, profileType: 'student' }
    },
    {
      path: '/student/book/:id',
      redirect: (to) => `/student/practice/${to.params.id}`
    },
    {
      path: '/student/level-test/:id',
      name: 'student-level-test',
      component: () => import('@/views/student/LevelTestView.vue'),
      meta: { requiresAuth: true, profileType: 'student' }
    },
    {
      path: '/student/notebook/:id',
      name: 'student-notebook',
      component: () => import('@/views/student/NotebookView.vue'),
      meta: { requiresAuth: true, profileType: 'student' }
    },
    {
      path: '/student/courses/:courseId/levels',
      name: 'student-course-levels',
      component: () => import('@/views/student/CourseLevelsView.vue'),
      meta: { requiresAuth: true, profileType: 'student' }
    },
    {
      path: '/teacher/courses/:courseId/notebooks/:id',
      name: 'teacher-notebook',
      component: () => import('@/views/teacher/NotebookEditorView.vue'),
      meta: { requiresAuth: true, profileType: 'teacher' }
    },
    {
      path: '/teacher/students/:studentId/progress',
      name: 'teacher-student-progress',
      component: () => import('@/views/teacher/StudentProgressView.vue'),
      meta: { requiresAuth: true, profileType: 'teacher' }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const token = getToken()
  const isAuthenticated = !!token

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }

  if (to.meta.requiresGuest && isAuthenticated) {
    next('/dashboard')
    return
  }

  if (to.meta.requiresAuth && to.meta.profileType) {
    try {
      const profileStr = localStorage.getItem('practiq_profile')
      if (profileStr) {
        const profile = JSON.parse(profileStr)
        if (profile.profile_type !== to.meta.profileType) {
          next(profile.profile_type === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
          return
        }
      }
    } catch {}
  }

  next()
})

export default router
