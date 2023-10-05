import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import BivInterface from './components/biv-interface.vue'


const biv = {
  template: BivInterface,
}


const home = {
  template: "<div>Home</div>",
}
const routes = [
  { path: '/', component: biv, props: true },
  { path: '/biv/:stop', component: biv, props: true }
  ]
  
  const router = createRouter({
    history: createWebHistory(),
    routes
  })
  
  createApp(App).use(router).mount('#app')