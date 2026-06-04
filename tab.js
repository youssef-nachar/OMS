function showDashboardHome() {
document.getElementById("reportConfigPage").classList.add("hidden")
    // إظهار الهيدر
    document.getElementById("dashboardHeader").style.display = "flex";

    // إخفاء كل التابات
    document.getElementById("newOrderTab").classList.add("hidden");
    document.getElementById("reportsTab").classList.add("hidden");
    document.getElementById("teamNotesTab").classList.add("hidden");
    document.getElementById("readyTab").classList.add("hidden");
    document.getElementById("returnTab").classList.add("hidden");
    document.getElementById("aboutTab").classList.add("hidden");
    document.getElementById("settingsTab").classList.add("hidden");

    // إظهار عناصر الداشبورد الرئيسية
    document.querySelector(".kpis").classList.remove("hidden");
    document.querySelector(".warehouse-container").classList.remove("hidden");
    document.querySelector(".sales-order").classList.remove("hidden");

}

function showAboutTab() {

    // إخفاء الهيدر إذا أردت
    document.getElementById("dashboardHeader").style.display = "none";

    // إخفاء كل التابات
    document.getElementById("newOrderTab").classList.add("hidden");
    document.getElementById("reportsTab").classList.add("hidden");
    document.getElementById("teamNotesTab").classList.add("hidden");
    document.getElementById("readyTab").classList.add("hidden");
    document.getElementById("returnTab").classList.add("hidden");

    // إخفاء عناصر الداشبورد
    document.querySelector(".kpis").classList.add("hidden");
    document.querySelector(".warehouse-container").classList.add("hidden");
    document.querySelector(".sales-order").classList.add("hidden");

    // إظهار About
    document.getElementById("aboutTab").classList.remove("hidden");

}
