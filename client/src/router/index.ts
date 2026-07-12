import { createRouter, createWebHistory } from 'vue-router'
import { STORAGE_KEYS } from '@trip/shared'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        {
          path: '',
          redirect: '/plan',
        },
        {
          path: 'plan',
          name: 'plan',
          component: () => import('@/views/PlanView.vue'),
        },
        {
          path: 'knowledge',
          name: 'knowledge',
          component: () => import('@/views/KnowledgeView.vue'),
        },
        {
          path: 'destinations',
          name: 'destinations',
          component: () => import('@/views/DestinationsView.vue'),
        },
        {
          path: 'itineraries',
          name: 'itineraries',
          component: () => import('@/views/ItinerariesView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
  if (!token && to.name !== 'login') {
    return { name: 'login' }
  }
})

export default router
