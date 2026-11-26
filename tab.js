function showDashboardHome() {
    document.getElementById("dashboardHeader").style.display = "flex";

    document.querySelectorAll(".main > div").forEach(div => div.classList.add("hidden"));

    [".kpis", ".warehouse-container", ".sales-order"].forEach(sel =>
        document.querySelector(sel)?.classList.remove("hidden")
    );
}

// function showAboutTab() {
//     document.getElementById("orderCommentsTab")
//         .classList.add("hidden");
// document.getElementById("advancedDashboardTab")
//         ?.classList.add("hidden");

//     // إخفاء الهيدر إذا أردت
//     document.getElementById("dashboardHeader").style.display = "none";

//     // إخفاء كل التابات
//     document.getElementById("newOrderTab").classList.add("hidden");
//     document.getElementById("reportsTab").classList.add("hidden");

//     document.getElementById("readyTab").classList.add("hidden");
//     document.getElementById("returnTab").classList.add("hidden");

//     // إخفاء عناصر الداشبورد
//     document.querySelector(".kpis").classList.add("hidden");
//     document.querySelector(".warehouse-container").classList.add("hidden");
//     document.querySelector(".sales-order").classList.add("hidden");

//     // إظهار About
//     document.getElementById("aboutTab").classList.remove("hidden");

// }
