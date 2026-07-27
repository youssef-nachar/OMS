// // Disable Right Click
// document.addEventListener("contextmenu", e => e.preventDefault());

// // Disable common DevTools shortcuts
// document.addEventListener("keydown", function (e) {

//     // F12
//     if (e.key === "F12") {
//         e.preventDefault();
//         return false;
//     }

//     // Ctrl+Shift+I / J / C
//     if (
//         e.ctrlKey &&
//         e.shiftKey &&
//         ["I", "J", "C"].includes(e.key.toUpperCase())
//     ) {
//         e.preventDefault();
//         return false;
//     }

//     // Ctrl+U
//     if (e.ctrlKey && e.key.toUpperCase() === "U") {
//         e.preventDefault();
//         return false;
//     }

//     // Ctrl+S
//     if (e.ctrlKey && e.key.toUpperCase() === "S") {
//         e.preventDefault();
//         return false;
//     }

//     // Ctrl+Shift+K (Firefox)
//     if (
//         e.ctrlKey &&
//         e.shiftKey &&
//         e.key.toUpperCase() === "K"
//     ) {
//         e.preventDefault();
//         return false;
//     }
// });

// (function () {

//     let opened = false;

//     setInterval(() => {

//         const widthThreshold =
//             window.outerWidth - window.innerWidth > 160;

//         const heightThreshold =
//             window.outerHeight - window.innerHeight > 160;

//         if (widthThreshold || heightThreshold) {

//             if (!opened) {

//                 opened = true;

//                 document.body.innerHTML = `
//                     <div style="
//                         display:flex;
//                         justify-content:center;
//                         align-items:center;
//                         height:100vh;
//                         background:#020617;
//                         color:white;
//                         font-size:28px;
//                         font-family:Arial;
//                         text-align:center;
//                     ">
//                         Security Violation Detected
//                     </div>
//                 `;

//             }

//         }

//     }, 500);

// })();
// document.addEventListener("dragstart", e => e.preventDefault());
// // document.addEventListener("selectstart", e => e.preventDefault());
