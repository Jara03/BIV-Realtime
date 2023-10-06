import { createRouter, createWebHistory } from 'vue-router'
import BivInterface from '../components/biv-interface'

const routes = [
  {
    path: '/biv/:stop',
    name: 'Biv',
    component: BivInterface
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router