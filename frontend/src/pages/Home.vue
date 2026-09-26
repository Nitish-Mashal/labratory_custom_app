<template>
  <div class="lab-dashboard">

    <main class="dashboard-content">

      <!-- TITLE + DATE FILTER -->
      <section class="page-heading">
        <div class="heading-left">
          <h2>Dashboard Overview</h2>
          <p>
            Welcome back,
            <span>Admin!</span>
            Here's what's happening in your lab today.
          </p>
        </div>

        <div class="dashboard-filter">
          <div class="date-field">
            <label for="from-date">From Date</label>
            <input id="from-date" v-model="fromDate" type="date" />
          </div>

          <div class="date-field">
            <label for="to-date">To Date</label>
            <input id="to-date" v-model="toDate" type="date" />
          </div>

          <button
            type="button"
            class="apply-filter-btn"
            @click="applyDateFilter"
          >
            Apply Filter
          </button>
        </div>
      </section>

      <!-- STAT CARDS -->
      <section class="stats-grid">
        <div
          v-for="card in statCards"
          :key="card.title"
          class="stat-card"
          :class="{ 'stat-card-clickable': !!card.action }"
          @click="card.action && card.action()"
        >
          <div class="stat-icon" :class="card.iconClass">
            <component :is="card.icon" />
          </div>

          <div class="stat-body">
            <p>{{ card.title }}</p>
            <h3>{{ card.value }}</h3>
            <span class="stat-change" :class="card.changeClass">
              {{ card.change }}
            </span>
          </div>
        </div>
      </section>

      <!-- MAIN DASHBOARD -->
      <section class="dashboard-grid">

        <!-- TEST STATUS -->
        <div class="panel status-panel">
          <div class="panel-header">
            <div>
              <h3>Test Status Overview</h3>
              <span>Completed and Pending reports</span>
            </div>
          </div>

          <div class="status-chart">
            <apexchart
              type="donut"
              height="280"
              width="100%"
              :options="statusOptions"
              :series="statusSeries"
              @dataPointSelection="handleLabTestStatusClick"
            />
          </div>
        </div>



        <!-- SALES INVOICE CHART -->
        <div class="panel sales-invoice-panel">
          <div class="sales-invoice-header">
            <div>
              <h3>Sales Invoice</h3>
              <span>Paid amount from the selected date range</span>
            </div>

            <el-select
              v-model="salesInvoiceFilter"
              size="default"
              class="sales-invoice-filter"
              @change="reloadSalesInvoiceChart"
            >
              <el-option label="Daily" value="daily" />
              <el-option label="Weekly" value="weekly" />
              <el-option label="Monthly" value="monthly" />
              <el-option label="Yearly" value="yearly" />
            </el-select>
          </div>

          <div class="sales-invoice-chart">
            <apexchart
              type="line"
              height="280"
              width="100%"
              :options="salesInvoiceChartOptions"
              :series="salesInvoiceSeries"
              @dataPointSelection="handleSalesInvoicePointClick"
            />
          </div>
        </div>

      </section>

      <!-- REPORTS + QUICK ACTIONS -->
      <section class="reports-actions-grid">

        <!-- REPORTS LIST -->
        <div class="panel reports-panel">
          <div class="panel-header">
            <div>
              <h3>Recent Lab Tests</h3>
              <span>Lab tests from the selected date range</span>
            </div>
          </div>

          <div class="reports-list">
            <div
              v-for="report in reports"
              :key="report.id"
              class="report-item report-item-clickable"
              @click="openLabTest(report.id)"
            >
              <div
                class="report-icon"
                :class="report.iconClass"
              >
                <component :is="report.icon" />
              </div>

              <div class="report-details">
                <strong>{{ report.patient }}</strong>
                <span>{{ report.id }}</span>
              </div>

              <div
                class="report-status"
                :class="report.statusClass"
              >
                <strong>{{ report.status }}</strong>
                <span>{{ report.date }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- QUICK ACTIONS -->
        <div class="panel quick-panel">
          <div class="panel-header">
            <div>
              <h3>Quick Actions</h3>
              <span>Common laboratory operations</span>
            </div>
          </div>

          <div class="quick-grid">
            <button
              v-for="action in quickActions"
              :key="action.label"
              class="quick-action"
              type="button"
              @click="action.action"
            >
              <div class="quick-icon" :class="action.class">
                <component :is="action.icon" />
              </div>
              <span>{{ action.label }}</span>
            </button>
          </div>
        </div>

      </section>

      <!-- BOTTOM BANNER -->
      <section class="smart-banner">

        <div class="banner-illustration">
           <img
    :src="'/files/quantumberg-logo.png'"
    alt="Quantumberg Technologies"
    class="banner-logo"
  />
        </div>

        <div class="banner-content">
          <h3>Smart Lab. Accurate Results. Happy Patients.</h3>

          <p>
            Streamline your laboratory workflow with Q-Dynamics
            <span class="powered-by">
              Powered By Quantumberg Technologies Pvt Ltd
            </span>
          </p>
        </div>

        <button
          type="button"
          @click="contactWhatsApp"
        >
          Learn More
          <ArrowRightIcon />
        </button>

        <div class="banner-pattern"></div>

      </section>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

import {
  BeakerIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  UserPlusIcon,
  ClipboardDocumentCheckIcon,
  DocumentCheckIcon,
} from '@heroicons/vue/24/outline'

const search = ref('')

/* =========================================================
   API
   ========================================================= */

const API_URL = '/api/method/labratory_custom_app.api.lab_dashboard.get_dashboard_data'

const loading = ref(false)
const apiError = ref('')

const dashboardData = ref(null)

/* =========================================================
   DATE FILTER
   ========================================================= */

const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const todayDate = formatDate(new Date())

// Default: today -> today
const fromDate = ref(todayDate)
const toDate = ref(todayDate)

/* =========================================================
   HELPERS
   ========================================================= */

const formatNumber = (value) => {
  const number = Number(value || 0)

  return number.toLocaleString('en-IN')
}

const formatDisplayDate = (value) => {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const displayLabTestStatus = (status) => {
  const value = String(status || '').trim()

  // Backend keeps "Draft"; dashboard displays it as "Pending".
  if (value.toLowerCase() === 'draft') {
    return 'Pending'
  }

  if (value.toLowerCase() === 'completed') {
    return 'Completed'
  }

  return value || '-'
}

const statusClass = (status) => {
  const value = String(status || '').toLowerCase()

  if (value === 'completed' || value === 'paid') {
    return 'completed'
  }

  if (value === 'draft' || value === 'pending' || value === 'unpaid') {
    return 'pending'
  }

  if (
    value === 'cancelled' ||
    value === 'rejected' ||
    value === 'overdue'
  ) {
    return 'progress'
  }

  return 'progress'
}

/* =========================================================
   FETCH DASHBOARD DATA
   ========================================================= */

async function fetchDashboardData() {
  loading.value = true
  apiError.value = ''

  try {
    const params = new URLSearchParams()

    // Always send the currently applied dates.
    // On first load both values are automatically today's date.
    if (fromDate.value) {
      params.set('from_date', fromDate.value)
    }

    if (toDate.value) {
      params.set('to_date', toDate.value)
    }

    const queryString = params.toString()
    const url = `${API_URL}?${queryString}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const result = await response.json()

    if (!result?.message?.success) {
      throw new Error(
        result?.message?.error ||
        result?.message?.message ||
        'Dashboard API returned an error'
      )
    }

    dashboardData.value = result.message

    // Keep the date controls synchronized with the dates
    // actually used by the backend.
    if (result.message?.filters?.from_date) {
      fromDate.value = result.message.filters.from_date
    }

    if (result.message?.filters?.to_date) {
      toDate.value = result.message.filters.to_date
    }
  } catch (error) {
    console.error('Dashboard API error:', error)

    dashboardData.value = null

    apiError.value =
      error?.message ||
      'Unable to load dashboard data.'
  } finally {
    loading.value = false
  }
}

/* =========================================================
   APPLY DATE FILTER
   ========================================================= */

function applyDateFilter() {
  if (!fromDate.value || !toDate.value) {
    alert('Please select From Date and To Date')
    return
  }

  if (fromDate.value > toDate.value) {
    alert('From Date cannot be greater than To Date')
    return
  }

  fetchDashboardData()
}

/* =========================================================
   SUMMARY
   ========================================================= */

const summary = computed(() => {
  return dashboardData.value?.summary || {
    total_lab_tests: 0,
    total_samples: 0,
  }
})

/* =========================================================
   LAB TEST STATUS COUNTS
   ========================================================= */

const labTestStatuses = computed(() => {
  return dashboardData.value?.lab_tests?.statuses || []
})

const getLabTestStatusCount = (status) => {
  const item = labTestStatuses.value.find(
    (row) => String(row.label || '').toLowerCase() === status.toLowerCase()
  )

  return Number(item?.count || 0)
}

/* =========================================================
   NAVIGATION / ROUTES
   ========================================================= */

const goTo = (path) => {
  window.location.href = path
}

const getCurrentDateFilters = () => {
  return {
    from_date: fromDate.value,
    to_date: toDate.value,
  }
}

const buildQuery = (params = {}) => {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })

  return query.toString()
}

const openNewPatient = () => {
  goTo('/desk/patient/new-patient')
}

const openNewSampleCollection = () => {
  goTo('/desk/sample-collection/new-sample-collection')
}

const openNewLabTest = () => {
  goTo('/desk/lab-test/new-lab-test')
}

const openLabTestReport = (status = null) => {
  const filters = getCurrentDateFilters()

  if (status) {
    filters.status = status
  }

  const query = buildQuery(filters)

  goTo(
    query
      ? `/desk/lab-test/view/report?${query}`
      : '/desk/lab-test/view/report'
  )
}

const openLabTestList = (status = null) => {
  const filters = getCurrentDateFilters()

  if (status) {
    filters.status = status
  }

  const query = buildQuery(filters)

  goTo(
    query
      ? `/desk/lab-test?${query}`
      : '/desk/lab-test'
  )
}

const openSalesInvoiceList = () => {
  const filters = getCurrentDateFilters()
  const query = buildQuery(filters)

  goTo(
    query
      ? `/desk/sales-invoice?${query}`
      : '/desk/sales-invoice'
  )
}

const openPatientList = () => {
  goTo('/desk/patient')
}

const openSampleCollectionList = () => {
  goTo('/desk/sample-collection')
}

const openLabTest = (name) => {
  if (!name) return
  goTo(`/desk/lab-test/${encodeURIComponent(name)}`)
}

const handleLabTestStatusClick = (_event, _chartContext, config) => {
  const index = config?.dataPointIndex

  if (index === undefined || index < 0) {
    return
  }

  const item = labTestStatuses.value[index]

  if (!item?.label) {
    return
  }

  const apiStatus = String(item.label).trim()

  openLabTestList(apiStatus)
}

const handleSalesInvoicePointClick = (_event, _chartContext, config) => {
  const index = config?.dataPointIndex

  if (index === undefined || index < 0) {
    return
  }

  const chartData = getSalesChartData.value
  const key = chartData.keys?.[index]

  if (!key) {
    openSalesInvoiceList()
    return
  }

  let filters = {
    from_date: fromDate.value,
    to_date: toDate.value,
  }

  if (salesInvoiceFilter.value === 'daily') {
    filters = {
      from_date: key,
      to_date: key,
    }
  } else if (salesInvoiceFilter.value === 'weekly') {
    const start = new Date(`${key}T00:00:00`)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)

    filters = {
      from_date: formatDate(start),
      to_date: formatDate(end),
    }
  } else if (salesInvoiceFilter.value === 'monthly') {
    const [year, month] = key.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)

    filters = {
      from_date: formatDate(start),
      to_date: formatDate(end),
    }
  } else if (salesInvoiceFilter.value === 'yearly') {
    filters = {
      from_date: `${key}-01-01`,
      to_date: `${key}-12-31`,
    }
  }

  const query = buildQuery(filters)

  goTo(
    query
      ? `/desk/sales-invoice?${query}`
      : '/desk/sales-invoice'
  )
}

/* =========================================================
   STAT CARDS
   ========================================================= */

const statCards = computed(() => [
  {
    title: 'Total Lab Tests',
    value: formatNumber(summary.value.total_lab_tests),
    change: 'Selected date range',
    icon: BeakerIcon,
    iconClass: 'blue',
    changeClass: 'positive',
    action: openLabTestList,
  },
  {
    title: 'Samples Collected',
    value: formatNumber(summary.value.total_samples),
    change: 'Selected date range',
    icon: BeakerIcon,
    iconClass: 'cyan',
    changeClass: 'positive',
    action: openSampleCollectionList,
  },
  {
    title: 'Completed Reports',
    value: formatNumber(getLabTestStatusCount('Completed')),
    change: 'Completed tests',
    icon: DocumentCheckIcon,
    iconClass: 'green',
    changeClass: 'positive',
    action: () => openLabTestList('Completed'),
  },
  {
    title: 'Pending Reports',
    value: formatNumber(getLabTestStatusCount('Draft')),
    change: 'Pending tests',
    icon: ClipboardDocumentCheckIcon,
    iconClass: 'purple',
    changeClass: 'positive',
    action: () => openLabTestList('Draft'),
  },
])

/* =========================================================
   LAB TEST STATUS DONUT
   ========================================================= */


const statusSeries = computed(() => {
  return labTestStatuses.value.map((item) => Number(item.count || 0))
})

const statusLabels = computed(() => {
  return labTestStatuses.value.map((item) => {
    const label = String(item.label || '')

    return label.toLowerCase() === 'draft'
      ? 'Pending'
      : label
  })
})

const statusOptions = computed(() => ({
  chart: {
    toolbar: {
      show: false,
    },
    fontFamily: 'Inter, sans-serif',
  },

  labels: statusLabels.value,

  colors: [
    '#673AB7',
    '#B83C91',
  ],

  stroke: {
    width: 2,
    colors: ['#ffffff'],
  },

  legend: {
    position: 'right',
    fontSize: '12px',
    labels: {
      colors: '#6e5b79',
    },
  },

  dataLabels: {
    enabled: false,
  },

  plotOptions: {
    pie: {
      donut: {
        size: '67%',
        labels: {
          show: true,

          name: {
            show: true,
            color: '#8e7d98',
          },

          value: {
            show: true,
            color: '#321247',
            fontSize: '24px',
            fontWeight: 700,
            formatter: (value) => formatNumber(value),
          },

          total: {
            show: true,
            label: 'Total',
            color: '#95869e',
            formatter: () => formatNumber(
              dashboardData.value?.lab_tests?.total || 0
            ),
          },
        },
      },
    },
  },

  noData: {
    text: 'No Lab Test data',
  },
}))

/* =========================================================
   SALES INVOICE CHART
   Uses recent_sales_invoices returned by the dashboard API.
   ========================================================= */

const salesInvoiceFilter = ref('daily')

const recentSalesInvoices = computed(() => {
  return dashboardData.value?.recent_sales_invoices || []
})

const dateKey = (value) => {
  if (!value) return null
  return String(value).slice(0, 10)
}

const getStartOfWeek = (date) => {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day

  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)

  return result
}

const getSalesChartData = computed(() => {
  const invoices = recentSalesInvoices.value

  if (!invoices.length) {
    return {
      labels: [],
      values: [],
    }
  }

  const grouped = new Map()

  invoices.forEach((invoice) => {
    const dateValue = dateKey(invoice.posting_date)
    if (!dateValue) return

    const date = new Date(`${dateValue}T00:00:00`)
    if (Number.isNaN(date.getTime())) return

    let key
    let label

    if (salesInvoiceFilter.value === 'daily') {
      key = dateValue
      label = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })
    } else if (salesInvoiceFilter.value === 'weekly') {
      const weekStart = getStartOfWeek(date)
      key = formatDate(weekStart)
      label = `Week ${weekStart.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })}`
    } else if (salesInvoiceFilter.value === 'monthly') {
      key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`

      label = date.toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    } else {
      key = String(date.getFullYear())
      label = String(date.getFullYear())
    }

    if (!grouped.has(key)) {
      grouped.set(key, {
        label,
        value: 0,
      })
    }

    // The API already calculates paid_amount correctly:
    // submitted invoice => grand_total - outstanding_amount
    // draft/cancelled => 0
    grouped.get(key).value += Number(invoice.paid_amount || 0)
  })

  const sorted = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))

  return {
    labels: sorted.map(([, item]) => item.label),
    values: sorted.map(([, item]) => item.value),
    keys: sorted.map(([key]) => key),
  }
})

const salesInvoiceSeries = computed(() => [
  {
    name: 'Paid Amount',
    data: getSalesChartData.value.values,
  },
])

const salesInvoiceChartOptions = computed(() => ({
  chart: {
    type: 'line',
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
    animations: {
      enabled: true,
    },
    fontFamily: 'Inter, sans-serif',
  },

  colors: ['#B83C91'],

  stroke: {
    curve: 'straight',
    width: 3,
    lineCap: 'round',
  },

  markers: {
    size: 5,
    strokeColors: '#ffffff',
    strokeWidth: 2,
    hover: {
      size: 7,
    },
  },

  dataLabels: {
    enabled: false,
  },

  xaxis: {
    categories: getSalesChartData.value.labels,
    title: {
      text:
        salesInvoiceFilter.value === 'daily'
          ? 'Day'
          : salesInvoiceFilter.value === 'weekly'
            ? 'Week'
            : salesInvoiceFilter.value === 'monthly'
              ? 'Month'
              : 'Year',
      style: {
        color: '#75647f',
        fontSize: '10px',
        fontWeight: 600,
      },
    },
    labels: {
      style: {
        colors: '#75647f',
        fontSize: '10px',
      },
    },
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },

  yaxis: {
    title: {
      text: 'Paid Amount',
      style: {
        color: '#75647f',
        fontSize: '10px',
        fontWeight: 600,
      },
    },
    labels: {
      style: {
        colors: '#75647f',
        fontSize: '10px',
      },
      formatter(value) {
        if (value >= 1000000) {
          return `₹${(value / 1000000).toFixed(1)}M`
        }

        if (value >= 1000) {
          return `₹${(value / 1000).toFixed(0)}K`
        }

        return `₹${Math.round(value)}`
      },
    },
  },

  grid: {
    borderColor: '#E5E7EB',
    strokeDashArray: 0,
    xaxis: {
      lines: {
        show: false,
      },
    },
  },

  tooltip: {
    shared: false,
    intersect: true,
    theme: 'light',
    y: {
      formatter: (value) =>
        `₹${Number(value || 0).toLocaleString('en-IN')}`,
    },
  },

  noData: {
    text: 'No Sales Invoice data',
  },
}))

function reloadSalesInvoiceChart() {
  // Computed data updates automatically.
}

/* =========================================================
   RECENT LAB TESTS
   ========================================================= */

const recentLabTests = computed(() => {
  return dashboardData.value?.recent_lab_tests || []
})

const reports = computed(() => {
  return recentLabTests.value.map((test) => ({
    id: test.name,
    name: test.patient_name || test.patient || 'Unknown Patient',
    patient: test.patient_name || test.patient || '-',
    status: displayLabTestStatus(test.status),
    date: formatDisplayDate(test.date),
    statusClass: statusClass(test.status),
    icon:
      String(test.status || '').toLowerCase() === 'completed'
        ? DocumentCheckIcon
        : ClipboardDocumentCheckIcon,
    iconClass:
      String(test.status || '').toLowerCase() === 'completed'
        ? 'teal'
        : 'purple',
  }))
})

/* =========================================================
   QUICK ACTIONS
   ========================================================= */

const quickActions = [
  {
    label: 'Add Patient',
    icon: UserPlusIcon,
    class: 'cyan',
    action: openNewPatient,
  },
  {
    label: 'Collect Sample',
    icon: BeakerIcon,
    class: 'green',
    action: openNewSampleCollection,
  },
  {
    label: 'Generate Report',
    icon: DocumentCheckIcon,
    class: 'blue',
    action: openNewLabTest,
  },
  {
    label: 'View Reports',
    icon: DocumentTextIcon,
    class: 'purple',
    action: () => openLabTestReport(),
  },
]

function viewAllReports() {
  console.log('View all lab tests', recentLabTests.value)
}

function contactWhatsApp() {
  window.open(
    'https://wa.me/919876543210',
    '_blank'
  )
}

function learnMore() {
  console.log('Learn more clicked')
}

/* =========================================================
   INITIAL LOAD
   ========================================================= */

onMounted(() => {
  // First load automatically sends today's date as both parameters.
  fetchDashboardData()
})
</script>

<style scoped>
.lab-dashboard {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg, #fbf8fd 0%, #f5eff8 100%);
  color: #2b1a36;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  box-sizing: border-box;
}

.lab-dashboard *,
.lab-dashboard *::before,
.lab-dashboard *::after {
  box-sizing: border-box;
}

.top-header {
  width: 100%;
  min-height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 30px;
  background: linear-gradient(90deg, #ffffff 0%, #fcf8fd 100%);
  border-bottom: 1px solid #eee7f3;
  gap: 30px;
}

.brand-area {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 260px;
}

.brand-logo {
  width: 48px;
  height: 48px;
  border-radius: 15px;
  background: linear-gradient(135deg, #321247 0%, #673AB7 52%, #B83C91 100%);
  box-shadow: 0 8px 18px rgba(84, 32, 111, .22);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 26px;
  font-weight: 800;
}

.brand-mark {
  transform: rotate(-8deg);
}

.brand-text h1 {
  margin: 0;
  font-size: 23px;
  line-height: 1;
  font-weight: 700;
  color: #321247;
}

.brand-text p {
  margin: 4px 0 0;
  font-size: 9px;
  line-height: 1.2;
  color: #887795;
  letter-spacing: .2px;
}

.header-center {
  flex: 1;
  max-width: 450px;
}

.search-box {
  height: 42px;
  border: 1px solid #e7deec;
  border-radius: 10px;
  background: #fdfbfe;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.search-box input,
.mobile-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #3d2a48;
}

.search-box input {
  font-size: 13px;
}

.search-box input::placeholder,
.mobile-search input::placeholder {
  color: #9b8ca5;
}

.search-icon,
.search-end {
  width: 17px;
  height: 17px;
  color: #9b8ca5;
  flex-shrink: 0;
}

.search-icon {
  margin-right: 7px;
}

.search-end {
  margin-left: 7px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-button {
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5a4567;
  cursor: pointer;
}

.icon-button:hover {
  background: #f7f0fa;
}

.icon-button svg {
  width: 21px;
  height: 21px;
}

.notification-btn {
  position: relative;
}

.notification-dot {
  position: absolute;
  top: 2px;
  right: 1px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 50%;
  background: #B83C91;
  color: white;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-left: 7px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f2e8f4;
  color: #673AB7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-info strong {
  font-size: 12px;
  color: #321247;
}

.user-info span {
  font-size: 10px;
  color: #907f99;
  margin-top: 2px;
}

.user-chevron {
  width: 15px;
  color: #806b8c;
}

.mobile-search {
  display: none;
}

.dashboard-content {
  width: 100%;
  max-width: 1520px;
  margin: 0 auto;
  padding: 22px 30px 30px;
}

/* =========================================
   PAGE HEADING
========================================= */

.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 18px;
}

.heading-left {
  min-width: 0;
}

.heading-left h2 {
  margin: 0;
  font-size: 21px;
  font-weight: 700;
  color: #243442;
}

.heading-left p {
  margin: 5px 0 0;
  color: #8f7f98;
  font-size: 12px;
}

.heading-left p span {
  color: #673AB7;
  font-weight: 600;
}

/* =========================================
   DASHBOARD DATE FILTER
========================================= */

.dashboard-filter {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-field label {
  font-size: 9px;
  font-weight: 600;
  color: #6f5b7c;
}

.date-field input {
  height: 38px;
  min-width: 135px;
  padding: 0 10px;
  border: 1px solid #ddd2e5;
  border-radius: 8px;
  background: #ffffff;
  color: #321247;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 10px;
  outline: none;
  transition: border-color .2s ease, box-shadow .2s ease;
}

.date-field input:hover {
  border-color: #b83c91;
}

.date-field input:focus {
  border-color: #673AB7;
  box-shadow: 0 0 0 3px rgba(103, 58, 183, .10);
}

.apply-filter-btn {
  height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #54206F, #B83C91);
  color: white;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 5px 12px rgba(84, 32, 111, .18);
  transition: transform .2s ease, box-shadow .2s ease;
}

.apply-filter-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 7px 16px rgba(84, 32, 111, .25);
}

.apply-filter-btn:active {
  transform: translateY(0);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 15px;
}

.stat-card {
  background: white;
  border: 1px solid #eee6f3;
  border-radius: 11px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 20px rgba(84, 32, 111, .055);
}

.stat-card-clickable {
  cursor: pointer;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}

.stat-card-clickable:hover {
  transform: translateY(-2px);
  border-color: #d9c5e4;
  box-shadow: 0 10px 24px rgba(84, 32, 111, .11);
}

.report-item-clickable {
  cursor: pointer;
  transition: background .18s ease, padding-left .18s ease;
}

.report-item-clickable:hover {
  background: #fbf6fd;
  padding-left: 5px;
}

.status-chart :deep(.apexcharts-pie-series path) {
  cursor: pointer;
}

.sales-invoice-chart :deep(.apexcharts-line-series path) {
  cursor: pointer;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 22px;
  height: 22px;
}

.stat-icon.blue {
  background: #f0ebfb;
  color: #673AB7;
}

.stat-icon.cyan {
  background: #f8edf6;
  color: #B83C91;
}

.stat-icon.teal {
  background: #f7eaf3;
  color: #D84B9D;
}

.stat-icon.green {
  background: #f2edf9;
  color: #8d63bf;
}

.stat-body {
  min-width: 0;
}

.stat-body p {
  margin: 0;
  font-size: 10px;
  color: #93a1ae;
}

.stat-body h3 {
  margin: 4px 0 2px;
  font-size: 20px;
  line-height: 1;
  color: #321247;
}

.stat-change {
  font-size: 9px;
  font-weight: 600;
}

.stat-change.positive {
  color: #8d5fb5;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
  gap: 14px;
  margin-bottom: 14px;
}

.panel {
  background: white;
  border: 1px solid #eee6f3;
  border-radius: 11px;
  box-shadow: 0 8px 24px rgba(84, 32, 111, .07);
  overflow: hidden;
  position: relative;
}

.panel::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #321247, #673AB7, #B83C91, #D84B9D);
  opacity: .95;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 15px 16px 8px;
}

.panel-header > div {
  min-width: 0;
}

.panel-header h3 {
  margin: 0;
  color: #321247;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .1px;
}

.panel-header span {
  display: block;
  margin-top: 3px;
  font-size: 9px;
  color: #93839c;
}

.panel-header button {
  border: 0;
  background: transparent;
  color: #673AB7;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}

.status-panel {
  min-height: 350px;
  width: 100%;
}

.status-chart {
  width: 100%;
  min-height: 290px;
  padding: 0 10px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sales-invoice-panel {
  min-height: 350px;
  width: 100%;
}

.sales-invoice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 16px 4px;
}

.sales-invoice-header h3 {
  margin: 0;
  color: #321247;
  font-size: 14px;
  font-weight: 700;
}

.sales-invoice-header span {
  display: block;
  margin-top: 3px;
  font-size: 9px;
  color: #93839c;
}

.sales-invoice-filter {
  width: 120px;
  flex-shrink: 0;
}

.sales-invoice-chart {
  width: 100%;
  padding: 8px 12px 8px;
}

.sales-invoice-chart :deep(.apexcharts-canvas) {
  width: 100% !important;
}

.sales-invoice-chart :deep(.apexcharts-tooltip) {
  border: 1px solid #eee6f3;
  box-shadow: 0 8px 24px rgba(84, 32, 111, .12);
}

.sales-invoice-chart :deep(.apexcharts-tooltip-title) {
  background: #f8f1fa;
  border-bottom: 1px solid #eadff0;
  color: #321247;
  font-size: 10px;
}

.sales-invoice-filter :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: none !important;
  border: 1px solid #e5e7eb;
}

.sales-invoice-filter :deep(.el-input__wrapper:hover) {
  border-color: #B83C91;
}

.sales-invoice-filter :deep(.el-input__wrapper.is-focus) {
  border-color: #B83C91;
  box-shadow: 0 0 0 3px rgba(184, 60, 145, .10) !important;
}

.reports-actions-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, .9fr);
  gap: 14px;
  margin-bottom: 14px;
  align-items: stretch;
}

.reports-panel,
.quick-panel {
  min-height: 230px;
}

.reports-list {
  padding: 4px 14px 11px;
}

.report-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #eee7f2;
}

.report-item:last-child {
  border-bottom: 0;
}

.report-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.report-icon svg {
  width: 17px;
  height: 17px;
}

.report-icon.teal {
  background: #f7eaf3;
  color: #673AB7;
}

.report-icon.blue {
  background: #f0ebfb;
  color: #6d4bc1;
}

.report-icon.purple {
  background: #f4eafa;
  color: #8a4e9f;
}

.report-icon.cyan {
  background: #f8edf6;
  color: #B83C91;
}

.report-icon.green {
  background: #f3eef9;
  color: #8d63bf;
}

.report-details {
  flex: 1;
  min-width: 0;
}

.report-details strong {
  display: block;
  font-size: 10px;
  color: #4b3a58;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-details span {
  display: block;
  margin-top: 3px;
  font-size: 8px;
  color: #99a5af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-status {
  text-align: right;
  min-width: 75px;
  flex-shrink: 0;
}

.report-status strong {
  display: block;
  font-size: 8px;
}

.report-status span {
  display: block;
  margin-top: 2px;
  font-size: 7px;
  color: #99a5af;
}

.report-status.completed strong {
  color: #4caf72;
}

.report-status.pending strong {
  color: #e6a63a;
}

.report-status.progress strong {
  color: #3d91df;
}

.quick-panel {
  margin-bottom: 0;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 4px 12px 12px;
}

.quick-action {
  min-height: 76px;
  border: 1px solid #edf2f4;
  background: #fdfbfe;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
}

.quick-action:hover {
  background: #faf4fb;
}

.quick-action span {
  font-size: 8px;
  color: #6d5a77;
  text-align: center;
}

.quick-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-icon svg {
  width: 16px;
  height: 16px;
}

.quick-icon.cyan {
  background: #f7eaf3;
  color: #B83C91;
}

.quick-icon.green {
  background: #f2edf9;
  color: #8d63bf;
}

.quick-icon.blue {
  background: #f0ebfb;
  color: #673AB7;
}

.quick-icon.purple {
  background: #f4eafa;
  color: #8a4e9f;
}

.smart-banner {
  position: relative;
  min-height: 88px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 20px;
  background: linear-gradient(100deg, #f7f0fa, #fcf8fd);
  border: 1px solid #eadff0;
  border-radius: 11px;
  overflow: hidden;
}

.banner-illustration {
  width: 90px;
  height: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: transparent;
  position: relative;
  z-index: 2;
}

.banner-logo {
  width: 85px;
  max-width: 100%;
  height: auto;
  max-height: 60px;
  object-fit: contain;
  display: block;
}

.banner-content {
  position: relative;
  z-index: 2;
  flex: 1;
  min-width: 0;
}

.banner-content h3 {
  margin: 0 0 4px;
  font-size: 14px;
  color: #321247;
}

.banner-content p {
  margin: 0;
  font-size: 9px;
  line-height: 1.5;
  color: #8d7b96;
}

.powered-by {
  display: inline-block;
  margin-left: 4px;
  color: #54206f;
  font-weight: 700;
}

.smart-banner > button {
  position: relative;
  z-index: 3;
  flex-shrink: 0;
  border: 0;
  background: linear-gradient(135deg, #54206F, #B83C91);
  color: white;
  border-radius: 9px;
  box-shadow: 0 6px 14px rgba(184, 60, 145, .22);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: transform .2s ease, box-shadow .2s ease;
}

.smart-banner > button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(184, 60, 145, .30);
}

.smart-banner > button svg {
  width: 13px;
  height: 13px;
}

.banner-pattern {
  position: absolute;
  right: 8px;
  top: 0;
  width: 170px;
  height: 100%;
  opacity: .45;
  background-image: radial-gradient(circle, #B83C91 1.5px, transparent 1.5px);
  background-size: 11px 11px;
  z-index: 1;
}

@media (max-width: 1000px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dashboard-content {
    padding-left: 18px;
    padding-right: 18px;
  }
  .header-center {
    max-width: 350px;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .reports-actions-grid {
    grid-template-columns: 1fr;
  }

  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1000px) {
  .page-heading {
    align-items: flex-start;
  }

  .dashboard-filter {
    flex-wrap: wrap;
  }
}

@media (max-width: 760px) {


  .page-heading {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .dashboard-filter {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: end;
  }

  .date-field input {
    width: 100%;
    min-width: 0;
  }

  .apply-filter-btn {
    grid-column: 1 / -1;
    width: 100%;
  }


  .top-header {
    min-height: 68px;
    padding: 10px 14px;
    gap: 12px;
  }

  .brand-area {
    min-width: 0;
  }

  .brand-text {
    display: none;
  }

  .header-center {
    display: none;
  }

  .header-actions {
    margin-left: auto;
    gap: 4px;
  }

  .user-info,
  .user-chevron {
    display: none;
  }

  .mobile-search {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 10px 12px 0;
    height: 40px;
    background: white;
    border: 1px solid #e6ebef;
    border-radius: 9px;
    padding: 0 10px;
  }

  .mobile-search svg {
    width: 16px;
    color: #99a5af;
    flex-shrink: 0;
  }

  .mobile-search input {
    font-size: 12px;
  }

  .dashboard-content {
    padding: 15px 12px 20px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .stat-card {
    padding: 11px;
    gap: 8px;
  }

  .stat-icon {
    width: 38px;
    height: 38px;
  }

  .stat-body h3 {
    font-size: 17px;
  }

  .stat-body p {
    font-size: 9px;
  }

  .smart-banner {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    padding: 14px;
  }

  .banner-illustration {
    width: 65px;
    height: 55px;
  }

  .banner-logo {
    width: 65px;
    max-height: 50px;
  }

  .banner-content {
    min-width: 0;
  }

  .banner-content h3 {
    font-size: 13px;
    line-height: 1.3;
  }

  .banner-content p {
    font-size: 8px;
    line-height: 1.5;
  }

  .powered-by {
    display: block;
    margin-left: 0;
    margin-top: 2px;
  }

  .smart-banner > button {
    padding: 8px 10px;
    font-size: 8px;
  }

  .smart-banner > button svg {
    width: 11px;
    height: 11px;
  }

  .banner-pattern {
    width: 100px;
    opacity: .3;
  }

  .report-status {
    min-width: 64px;
  }
}

@media (max-width: 420px) {
  .dashboard-filter {
    grid-template-columns: 1fr;
  }

  .apply-filter-btn {
    grid-column: auto;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .quick-grid {
    grid-template-columns: 1fr 1fr;
  }

  .smart-banner {
    flex-wrap: wrap;
    gap: 9px;
    padding: 12px;
  }

  .banner-illustration {
    width: 55px;
    height: 50px;
  }

  .banner-logo {
    width: 55px;
    max-height: 45px;
  }

  .banner-content {
    flex: 1;
  }

  .banner-content h3 {
    font-size: 12px;
  }

  .banner-content p {
    font-size: 7px;
  }

  .smart-banner > button {
    width: 100%;
    margin-top: 4px;
  }

  .banner-pattern {
    width: 90px;
  }
}
</style>
