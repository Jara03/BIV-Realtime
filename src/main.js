import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import BivInterface from './components/biv-interface.vue'

const routes = [
    { path: '/biv/:param', component: BivInterface, props: true }
  ]
  
  const router = createRouter({
    history: createWebHistory(),
    routes
  })
  
  createApp(App).use(router).mount('#app')