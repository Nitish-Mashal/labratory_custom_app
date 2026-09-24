import {
  createRouter,
  createMemoryHistory
} from 'vue-router'


const routes = [

  {
    path: '/',
    name: 'Home',

    component: () =>
      import('@/pages/Home.vue'),
  },

]


const router = createRouter({

  history: createMemoryHistory(),

  routes,

})


export default router