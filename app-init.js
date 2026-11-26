// /* =========================================================
//    app-init.js  —  login, boot and page guards (load LAST)
//    Replaces the old DOMContentLoaded block and loginForm.onsubmit
//    that lived in test.js.
//    ========================================================= */

// /* ---------------------------------------------------------
//    Page guards: every screen declares the permission it needs
//    --------------------------------------------------------- */

const PAGE_PERMISSIONS = {
    showDashboardHome: "viewDashboard",
    showAdvancedDashboard: "viewAdvanced",
    showNewOrderTab: "viewOrders",
    showReadyToDistributeTab: "viewReady",
    showReturnTab: "viewReturns",
    showReportsTab: "viewReports",
    openOrderCommentsTab: "viewComplaints",
    openTeamNotesTab: "teamNotes"
};

function installPageGuards() {
    Object.entries(PAGE_PERMISSIONS).forEach(([fnName, permission]) => {
        const original = window[fnName];
        if (typeof original !== "function" || original.__guarded) return;

        const guarded = function (...args) {
            if (!can(permission)) {
                showToast("You do not have access to this page", "error");
                return;
            }
            // tabs added later are not known to the older show*() functions
            if (typeof hideSalesTab === "function") hideSalesTab();
            document.getElementById("usersTab")?.classList.add("hidden");
            document.getElementById("settingsTab")?.classList.add("hidden");
            document.querySelector(".no-access")?.remove();
            return original.apply(this, args);
        };
        guarded.__guarded = true;
        window[fnName] = guarded;
    });

    // the Users page is not guarded above, but it must also close the Sales tab first
    const openUsers = window.openUsersTab;
    if (typeof openUsers === "function" && !openUsers.__closesSales) {
        const wrapped = function (...args) {
            if (can("manageUsers") && typeof hideSalesTab === "function") hideSalesTab();
            return openUsers.apply(this, args);
        };
        wrapped.__closesSales = true;
        window.openUsersTab = wrapped;
    }

    // action guards for functions that are only reachable by direct calls
    const ACTIONS = {
        saveOrderComment: "manageComplaints",
        saveEditedComment: "manageComplaints",
        deleteComment: "manageComplaints",
        saveReply: "manageComplaints",
        deleteReply: "manageComplaints",
        cancelOrder: "cancelOrders",
        saveEditedOrder: "editOrders"
    };

    Object.entries(ACTIONS).forEach(([fnName, permission]) => {
        const original = window[fnName];
        if (typeof original !== "function") return;

        window[fnName] = function (...args) {
            // editing an order's comment is allowed for everyone who can open it;
            // only changing the order NUMBER needs editOrders
            if (fnName === "saveEditedOrder") return original.apply(this, args);
            if (!requirePermission(permission)) return;
            return original.apply(this, args);
        };
    });
}

/* ---------------------------------------------------------
   Landing page: first screen the user is allowed to see
   --------------------------------------------------------- */

function goToLandingPage() {
    const landing = [
        ["viewDashboard", () => showDashboardHome()],
        ["viewOrders", () => showNewOrderTab()],
        ["viewReady", () => showReadyToDistributeTab()],
        ["viewReturns", () => showReturnTab()],
        ["viewReports", () => showReportsTab()],
        ["viewComplaints", () => openOrderCommentsTab()],
        ["manageUsers", () => openUsersTab()]
    ].find(([perm]) => can(perm));

    if (landing) return landing[1]();

    // someone whose only access is the Sales Report lands there
    if (typeof canViewSales === "function" && canViewSales()) return showSalesTab();

    document.querySelectorAll(".main > div").forEach(d => d.classList.add("hidden"));
    document.getElementById("dashboardHeader").style.display = "none";
    document.querySelector(".main").insertAdjacentHTML("beforeend",
        `<div class="no-access">Your account has no permissions yet. Ask a manager to grant access.</div>`);
}

/* ---------------------------------------------------------
   Enter the app (after login or on page load with a session)
   --------------------------------------------------------- */

function enterApp() {
    document.getElementById("loginContainer").style.display = "none";
    document.getElementById("dashboard").classList.remove("hidden");

    loadSettings();
    applyPermissionsToUI();
    if (typeof initSalesTab === "function") initSalesTab();      // Sales Report link + saved choices
    renderImpersonationBanner();
    initReturnTab();
    installPageGuards();

    // listeners are started once, only for what the user may see
    if (canAny("viewDashboard", "viewOrders", "viewReady", "viewReports", "viewAdvanced", "viewReturns")) {
        listenToOrders();
    }
    if (canAny("viewDashboard", "viewReturns", "viewReports", "viewOrders")) {
        listenToReturnedOrders();
    }

    // the dashboard header date range needs a default
    if (can("viewDashboard") && typeof initDate === "function") initDate();

    goToLandingPage();

    document.getElementById("orderDetails")?.addEventListener("click", e => {
        if (e.target.id === "orderDetails") e.target.classList.add("hidden");
    });

    if (localStorage.getItem("mustChangePassword") === "true") {
        showChangePasswordModal(true);
    }
}

/* ---------------------------------------------------------
   Login form
   --------------------------------------------------------- */

document.getElementById("loginForm").addEventListener("submit", async e => {
    e.preventDefault();

    const button = e.target.querySelector(".login-btn");
    const errorBox = document.getElementById("loginError");

    button.disabled = true;
    errorBox.classList.add("hidden");

    const result = await Auth.login(
        document.getElementById("username").value.trim(),
        document.getElementById("password").value
    );

    button.disabled = false;

    if (!result.ok) {
        errorBox.lastChild.textContent = " " + result.error;
        errorBox.classList.remove("hidden");
        return;
    }

    localStorage.setItem("mustChangePassword", result.user.mustChangePassword ? "true" : "false");
    document.getElementById("password").value = "";
    enterApp();
});

/* ---------------------------------------------------------
   Boot (page refresh with an existing session)
   --------------------------------------------------------- */

// window.addEventListener("DOMContentLoaded", async () => {

//     if (!Auth.isLoggedIn()) {
//         Auth.logout(false);
//         return;
//     }

//     const user = await Auth.refresh();           // picks up disabled users / changed permissions

//     if (!user) {
//         location.reload();
//         return;
//     }

//     enterApp();
// });
