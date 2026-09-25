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


// ==================================================
// GLOBAL VUE APP
// ==================================================

let vueApp = null;
let currentContainer = null;


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
    // Frappe UI
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
    // Frappe UI Resources
    // ------------------------------------------------

    app.use(resourcesPlugin);


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
// FRAPPE DASHBOARD
// ==================================================

function mountFrappeDashboard(container = null) {

    // ------------------------------------------------
    // Frappe check
    // ------------------------------------------------

    if (!window.frappe) {
        return;
    }


    // ------------------------------------------------
    // If page JS supplied a container,
    // use that container directly
    // ------------------------------------------------

    if (container) {

        mountVueToContainer(container);

        return;
    }


    // ------------------------------------------------
    // Find Frappe main section
    // ------------------------------------------------

    const mainSection =
        document.querySelector(
            ".layout-main-section"
        );


    if (!mainSection) {

        console.warn(
            "Lab Dashboard: Frappe main section not ready"
        );

        return false;
    }


    // ------------------------------------------------
    // Remove Frappe padding
    // ------------------------------------------------

    mainSection.style.padding = "0";


    // ------------------------------------------------
    // Existing host
    // ------------------------------------------------

    let host =
        mainSection.querySelector(
            "#lab-dashboard-vue-host"
        );


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


    // ------------------------------------------------
    // Mount Vue inside host
    // ------------------------------------------------

    mountVueToContainer(host);

    return true;
}


// ==================================================
// MOUNT VUE INTO CONTAINER
// ==================================================

function mountVueToContainer(host) {

    if (!host) {

        console.error(
            "Lab Dashboard: host element missing"
        );

        return;
    }


    // ------------------------------------------------
    // Already mounted on same container
    // ------------------------------------------------

    if (
        vueApp &&
        currentContainer === host
    ) {

        console.log(
            "Lab Dashboard: already mounted"
        );

        return;
    }


    // ------------------------------------------------
    // Unmount previous Vue app
    // ------------------------------------------------

    if (vueApp) {

        try {

            vueApp.unmount();

        } catch (error) {

            console.error(
                "Lab Vue unmount error:",
                error
            );

        }

        vueApp = null;
        currentContainer = null;
    }


    // ------------------------------------------------
    // Clear host
    // ------------------------------------------------

    host.innerHTML = "";


    // ------------------------------------------------
    // Remove old shadow root if needed
    // ------------------------------------------------

    let shadow = null;


    try {

        shadow =
            host.shadowRoot;

    } catch (error) {

        shadow = null;
    }


    // ------------------------------------------------
    // Create Shadow DOM
    // ------------------------------------------------

    if (!shadow) {

        try {

            shadow =
                host.attachShadow({
                    mode: "open"
                });

        } catch (error) {

            console.warn(
                "Shadow DOM could not be created:",
                error
            );

            // Fallback to normal container

            vueApp =
                createLabApp(host);

            currentContainer =
                host;

            return;
        }

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
    // Create Vue app
    // ------------------------------------------------

    vueApp =
        createLabApp(container);


    currentContainer =
        container;


    console.log(
        "Lab Dashboard mounted inside Frappe"
    );
}


// ==================================================
// UNMOUNT
// ==================================================

function unmountFrappeDashboard() {

    if (vueApp) {

        try {

            vueApp.unmount();

        } catch (error) {

            console.error(
                "Lab Vue unmount error:",
                error
            );

        }

        vueApp = null;
        currentContainer = null;
    }


    const hosts =
        document.querySelectorAll(
            "#lab-dashboard-vue-host"
        );


    hosts.forEach((host) => {

        host.remove();

    });
}


// ==================================================
// RETRY MOUNT
// ==================================================

function retryMountFrappeDashboard(
    attempts = 20
) {

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


    // Already mounted
    if (vueApp) {

        return;
    }


    const success =
        mountFrappeDashboard();


    if (success) {

        return;
    }


    // Retry every 100ms
    if (attempts > 0) {

        setTimeout(() => {

            retryMountFrappeDashboard(
                attempts - 1
            );

        }, 100);

    } else {

        console.error(
            "Lab Dashboard: failed to mount after retries"
        );

    }
}


// ==================================================
// ROUTE CHECK
// ==================================================

function checkFrappeRoute() {

    if (!window.frappe) {
        return;
    }


    const route =
        frappe.get_route();


    if (
        route &&
        route[0] === "lab_dashboard"
    ) {

        retryMountFrappeDashboard();

    } else {

        if (vueApp) {

            unmountFrappeDashboard();

        }

    }
}


// ==================================================
// CUSTOM EVENT FROM Frappe page JS
// ==================================================

window.addEventListener(
    "lab-dashboard-mount",
    function (event) {

        console.log(
            "Lab Dashboard mount event received"
        );


        const element =
            event.detail?.element;


        if (!element) {

            console.warn(
                "Lab Dashboard: mount event has no element"
            );

            retryMountFrappeDashboard();

            return;
        }


        mountVueToContainer(element);

    }
);


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
    // Frappe
    // ------------------------------------------------

    setTimeout(() => {

        checkFrappeRoute();

    }, 100);


    // ------------------------------------------------
    // Frappe route changes
    // ------------------------------------------------

    if (
        frappe.router &&
        typeof frappe.router.on === "function"
    ) {

        frappe.router.on(
            "change",
            function () {

                console.log(
                    "Frappe route changed:",
                    frappe.get_route()
                );


                setTimeout(() => {

                    checkFrappeRoute();

                }, 100);

            }
        );

    }

}




initialize();