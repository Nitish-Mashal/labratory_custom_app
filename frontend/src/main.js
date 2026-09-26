import "./index.css";

import { createApp } from "vue";

import router from "./router";

import App from "./App.vue";

import {
    Button,
    setConfig,
    frappeRequest,
    resourcesPlugin,
} from "frappe-ui";

import VueApexCharts from "vue3-apexcharts";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";



// ==================================================
// GLOBAL VARIABLES
// ==================================================

let vueApp = null;

let currentContainer = null;

let currentHost = null;


// ==================================================
// CREATE VUE APP
// ==================================================

function createLabApp(container) {

    if (!container) {

        console.error(
            "Lab Dashboard: Vue container not found"
        );

        return null;
    }


    const app = createApp(App);


    // ------------------------------------------------
    // Frappe UI configuration
    // ------------------------------------------------

    if (window.frappe) {

        setConfig(
            "resourceFetcher",
            frappeRequest
        );

    }


    // ------------------------------------------------
    // Vue Router
    // ------------------------------------------------

    app.use(router);


    // ------------------------------------------------
    // Frappe UI
    // ------------------------------------------------

    app.use(resourcesPlugin);

    app.use(ElementPlus);
    // ------------------------------------------------
    // ApexCharts
    // ------------------------------------------------

    app.use(VueApexCharts);


    // ------------------------------------------------
    // Components
    // ------------------------------------------------

    app.component(
        "Button",
        Button
    );

    app.component(
        "apexchart",
        VueApexCharts
    );


    // ------------------------------------------------
    // Mount
    // ------------------------------------------------

    app.mount(container);


    return app;
}


// ==================================================
// UNMOUNT CURRENT VUE APP
// ==================================================

function unmountVueApp() {

    if (vueApp) {

        try {

            vueApp.unmount();

        } catch (error) {

            console.error(
                "Lab Vue unmount error:",
                error
            );

        }

    }


    vueApp = null;

    currentContainer = null;

}


// ==================================================
// FIND / CREATE FRAPPE HOST
// ==================================================

function getFrappeHost(wrapper) {

    if (!wrapper) {

        console.error(
            "Lab Dashboard: wrapper not found"
        );

        return null;
    }


    // ------------------------------------------------
    // Find Frappe page section
    // ------------------------------------------------

    const mainSection =
        wrapper.querySelector(
            ".layout-main-section"
        );


    if (!mainSection) {

        console.warn(
            "Lab Dashboard: main section not ready"
        );

        return null;
    }


    // Remove Frappe default padding

    mainSection.style.padding = "0";


    // ------------------------------------------------
    // Find existing host
    // ------------------------------------------------

    let host =
        mainSection.querySelector(
            "#lab-dashboard-vue-host"
        );


    // ------------------------------------------------
    // Create host if missing
    // ------------------------------------------------

    if (!host) {

        host =
            document.createElement("div");

        host.id =
            "lab-dashboard-vue-host";

        host.style.width =
            "100%";

        host.style.minHeight =
            "calc(100vh - 70px)";

        host.style.boxSizing =
            "border-box";


        mainSection.appendChild(host);

    }


    return host;
}


// ==================================================
// MOUNT VUE INSIDE FRAPPE
// ==================================================

function mountFrappeDashboard(wrapper) {

    if (!window.frappe) {

        return;
    }


    const route =
        frappe.get_route();


    // Only mount on Lab Dashboard

    if (
        !route ||
        route[0] !== "lab_dashboard"
    ) {

        return;
    }


    // ------------------------------------------------
    // Get or create host
    // ------------------------------------------------

    const host =
        getFrappeHost(wrapper);


    if (!host) {

        return false;
    }


    // ------------------------------------------------
    // Already mounted
    // ------------------------------------------------

    if (
        vueApp &&
        currentHost === host
    ) {

        console.log(
            "Lab Dashboard already mounted"
        );

        return true;
    }


    // ------------------------------------------------
    // Unmount old Vue app
    // ------------------------------------------------

    if (vueApp) {

        unmountVueApp();

    }


    // ------------------------------------------------
    // Shadow DOM
    // ------------------------------------------------

    let shadow =
        host.shadowRoot;


    // ------------------------------------------------
    // Create Shadow DOM
    // ------------------------------------------------

    if (!shadow) {

        shadow =
            host.attachShadow({
                mode: "open"
            });

    }


    // ------------------------------------------------
    // Clear Shadow DOM
    // ------------------------------------------------

    shadow.innerHTML = "";


    // ------------------------------------------------
    // Load dashboard CSS
    // ------------------------------------------------

    const style =
        document.createElement("link");

    style.rel =
        "stylesheet";

    style.href =
        "/assets/labratory_custom_app/frontend/index.css";


    shadow.appendChild(style);


    // ------------------------------------------------
    // Vue container
    // ------------------------------------------------

    const container =
        document.createElement("div");

    container.id =
        "lab-dashboard-vue";

    container.style.width =
        "100%";

    container.style.minHeight =
        "calc(100vh - 70px)";

    container.style.boxSizing =
        "border-box";


    shadow.appendChild(container);


    // ------------------------------------------------
    // Create Vue application
    // ------------------------------------------------

    vueApp =
        createLabApp(container);


    currentContainer =
        container;

    currentHost =
        host;


    console.log(
        "Lab Dashboard Vue mounted successfully"
    );


    return true;
}


// ==================================================
// GLOBAL FUNCTION
// Called from lab_dashboard.js
// ==================================================

window.mountLabDashboardFromFrappe =
    function (wrapper) {

        let attempts = 0;

        const maxAttempts = 20;


        function tryMount() {

            attempts++;


            // Check current route

            if (!window.frappe) {

                return;
            }


            const route =
                frappe.get_route();


            if (
                !route ||
                route[0] !== "lab_dashboard"
            ) {

                return;
            }


            const success =
                mountFrappeDashboard(wrapper);


            if (success) {

                return;
            }


            // Frappe DOM may not be ready yet

            if (
                attempts < maxAttempts
            ) {

                setTimeout(
                    tryMount,
                    100
                );

            } else {

                console.error(
                    "Lab Dashboard: unable to mount after retries"
                );

            }

        }


        tryMount();

    };


// ==================================================
// ROUTE CHANGE
// ==================================================

function handleRouteChange() {

    if (!window.frappe) {

        return;
    }


    const route =
        frappe.get_route();


    console.log(
        "Frappe route:",
        route
    );


    // ------------------------------------------------
    // LAB DASHBOARD
    // ------------------------------------------------

    if (
        route &&
        route[0] === "lab_dashboard"
    ) {

        /*
         * IMPORTANT:
         *
         * Frappe caches pages.
         * Therefore on_page_load does NOT execute
         * again when returning to the page.
         *
         * We explicitly find the current wrapper
         * and mount again.
         */


        setTimeout(function () {

            const wrapper =
                document.querySelector(
                    '[data-page-route="lab_dashboard"]'
                );


            if (wrapper) {

                window.mountLabDashboardFromFrappe(
                    wrapper
                );

                return;
            }


            // Fallback: use page wrapper

            const mainSection =
                document.querySelector(
                    ".layout-main-section"
                );


            if (mainSection) {

                mountFrappeDashboard(
                    mainSection.parentElement
                );

            }

        }, 100);


        return;
    }


    // ------------------------------------------------
    // OTHER DESK PAGE
    // ------------------------------------------------

    if (vueApp) {

        console.log(
            "Leaving Lab Dashboard - unmounting Vue"
        );


        unmountVueApp();


        currentHost =
            null;


        /*
         * Do NOT remove the host here.
         *
         * Frappe may reuse the page.
         *
         * It will be reused when we return.
         */

    }

}


// ==================================================
// STANDALONE VUE MODE
// ==================================================

function mountStandalone() {

    const container =
        document.getElementById("app");


    if (!container) {

        console.error(
            "Vue #app element not found"
        );

        return;
    }


    if (vueApp) {

        return;
    }


    vueApp =
        createLabApp(container);


    currentContainer =
        container;


    console.log(
        "Lab Dashboard running in standalone Vue mode"
    );

}


// ==================================================
// INITIALIZATION
// ==================================================

function initialize() {


    // ------------------------------------------------
    // Standalone Vue
    // ------------------------------------------------

    if (!window.frappe) {

        mountStandalone();

        return;
    }


    // ------------------------------------------------
    // Initial Frappe route
    // ------------------------------------------------

    setTimeout(function () {

        handleRouteChange();

    }, 300);


    // ------------------------------------------------
    // Frappe route listener
    // ------------------------------------------------

    if (
        frappe.router &&
        typeof frappe.router.on === "function"
    ) {

        frappe.router.on(
            "change",
            function () {

                console.log(
                    "Frappe route changed"
                );


                setTimeout(
                    handleRouteChange,
                    100
                );

            }
        );

    }

}


initialize();