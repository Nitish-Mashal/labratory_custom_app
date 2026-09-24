// import {
//   createRouter,
//   createMemoryHistory
// } from 'vue-router'


// const routes = [

//   {
//     path: '/',
//     name: 'Home',

//     component: () =>
//       import('@/pages/Home.vue'),
//   },

// ]


// const router = createRouter({

//   history: createMemoryHistory(),

//   routes,

// })


// export default router
import {
  createRouter,
  createWebHistory,
} from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/Home.vue'),
  },
]

const router = createRouter({
  history: createWebHistory('/desk/lab_dashboard/'),
  routes,
})

export default router