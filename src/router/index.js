import { createRouter, createWebHistory } from 'vue-router'
import BivInterface from '../components/BivInterface'

const routes = [
  {
    path: '/',
    name: 'Biv',
    component: BivInterface
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router