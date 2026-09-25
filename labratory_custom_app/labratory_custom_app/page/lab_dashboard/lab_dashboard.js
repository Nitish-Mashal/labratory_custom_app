frappe.pages["lab_dashboard"].on_page_load = function (wrapper) {

    frappe.ui.make_app_page({
        parent: wrapper,
        title: "Lab Dashboard",
        single_column: true
    });


    // Wait for Frappe to finish creating
    // .layout-main-section
    setTimeout(function () {

        const mainSection =
            wrapper.querySelector(
                ".layout-main-section"
            );


        if (!mainSection) {

            console.warn(
                "Lab Dashboard: main section not ready"
            );

            return;
        }


        // Remove default Frappe padding
        mainSection.style.padding = "0";


        // Create Vue host
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


        // Tell Vue main.js to mount
        window.dispatchEvent(
            new CustomEvent(
                "lab-dashboard-mount",
                {
                    detail: {
                        element: host
                    }
                }
            )
        );


    }, 100);

};


// ==================================================
// PAGE SHOW
// ==================================================

frappe.pages["lab_dashboard"].on_page_show =
    function (wrapper) {

        setTimeout(function () {

            const host =
                wrapper.querySelector(
                    "#lab-dashboard-vue-host"
                );


            if (!host) {
                return;
            }


            window.dispatchEvent(
                new CustomEvent(
                    "lab-dashboard-mount",
                    {
                        detail: {
                            element: host
                        }
                    }
                )
            );


        }, 100);

    };