import './index.css'

import { createApp } from 'vue'

import router from './router'

import App from './App.vue'

import {
  Button,
  setConfig,
  frappeRequest,
  resourcesPlugin,
} from 'frappe-ui'

import VueApexCharts from 'vue3-apexcharts'


let vueApp = null


// --------------------------------------------------
// CREATE VUE APP
// --------------------------------------------------

function createLabApp(container) {

  const app = createApp(App)

  // Frappe UI configuration
  if (window.frappe) {
    setConfig(
      'resourceFetcher',
      frappeRequest
    )
  }

  // Vue Router
  app.use(router)

  // Frappe UI resources
  app.use(resourcesPlugin)

  // ApexCharts
  app.use(VueApexCharts)

  // Components
  app.component(
    'Button',
    Button
  )

  app.component(
    'apexchart',
    VueApexCharts
  )

  // Mount
  app.mount(container)

  return app
}


// --------------------------------------------------
// STANDALONE VUE MODE
// --------------------------------------------------

function mountStandalone() {

  const container =
    document.getElementById('app')

  if (!container) {

    console.error(
      'Vue #app element not found'
    )

    return
  }

  // Prevent duplicate mount
  if (vueApp) {
    return
  }

  vueApp =
    createLabApp(container)

  console.log(
    'Lab Dashboard running in standalone Vue mode'
  )
}


// --------------------------------------------------
// FRAPPE MODE
// /desk/lab_dashboard
// --------------------------------------------------

function mountFrappeDashboard() {

  // Frappe must exist
  if (!window.frappe) {
    return
  }


  // Get current Frappe route
  const route =
    frappe.get_route()


  // IMPORTANT:
  // This must be lab_dashboard
  if (
    !route ||
    route[0] !== 'lab_dashboard'
  ) {
    return
  }


  // Frappe main content
  const mainSection =
    document.querySelector(
      '.layout-main-section'
    )


  if (!mainSection) {

    console.warn(
      'Frappe main section not ready'
    )

    return
  }


  // Already mounted
  let host =
    document.getElementById(
      'lab-dashboard-vue-host'
    )


  if (host) {
    return
  }


  // Remove Frappe page padding
  mainSection.style.padding = '0'


  // Create host
  host =
    document.createElement('div')

  host.id =
    'lab-dashboard-vue-host'

  host.style.width =
    '100%'

  host.style.minHeight =
    'calc(100vh - 70px)'

  host.style.boxSizing =
    'border-box'


  mainSection.appendChild(host)


  // ------------------------------------------------
  // SHADOW DOM
  // ------------------------------------------------

  const shadow =
    host.attachShadow({
      mode: 'open'
    })


  // Load Lab Dashboard CSS
  const style =
    document.createElement('link')

  style.rel =
    'stylesheet'

  style.href =
    '/assets/labratory_custom_app/frontend/index.css'

  shadow.appendChild(style)


  // Vue container
  const container =
    document.createElement('div')

  container.id =
    'lab-dashboard-vue'

  container.style.width =
    '100%'

  container.style.minHeight =
    '100%'

  container.style.boxSizing =
    'border-box'


  shadow.appendChild(container)


  // ------------------------------------------------
  // CREATE VUE APP
  // ------------------------------------------------

  vueApp =
    createLabApp(container)


  console.log(
    'Lab Dashboard mounted inside Frappe'
  )
}


// --------------------------------------------------
// UNMOUNT FRAPPE DASHBOARD
// --------------------------------------------------

function unmountFrappeDashboard() {

  if (vueApp) {

    try {

      vueApp.unmount()

    } catch (error) {

      console.error(
        'Lab Vue unmount error:',
        error
      )

    }

    vueApp = null
  }


  const host =
    document.getElementById(
      'lab-dashboard-vue-host'
    )


  if (host) {
    host.remove()
  }
}


// --------------------------------------------------
// CHECK FRAPPE ROUTE
// --------------------------------------------------

function checkFrappeRoute() {

  if (!window.frappe) {
    return
  }


  const route =
    frappe.get_route()


  if (
    route &&
    route[0] === 'lab_dashboard'
  ) {

    setTimeout(() => {

      mountFrappeDashboard()

    }, 300)

  } else {

    unmountFrappeDashboard()

  }
}


// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------

function initialize() {

  // ------------------------------------------------
  // STANDALONE VUE
  // ------------------------------------------------

  if (!window.frappe) {

    mountStandalone()

    return
  }


  // ------------------------------------------------
  // FRAPPE
  // ------------------------------------------------

  setTimeout(() => {

    checkFrappeRoute()

  }, 500)


  // Frappe route changes
  if (
    frappe.router &&
    typeof frappe.router.on === 'function'
  ) {

    frappe.router.on(
      'change',
      () => {

        setTimeout(() => {

          checkFrappeRoute()

        }, 300)

      }
    )

  }
}


// --------------------------------------------------
// START
// --------------------------------------------------

initialize()