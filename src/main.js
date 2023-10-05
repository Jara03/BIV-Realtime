import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import BivInterface from './components/biv-interface.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/:id', component: BivInterface, props: true } // Route with a dynamic parameter 'id'
    ]
  })

  const app = createApp(App)

  app.use(router)
  
  app.mount('#app')
