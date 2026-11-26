# OMS – ما تغيّر

## ملفات جديدة
utils.js · users.js · usersTab.js · orders-service.js · distribution.js · app-init.js · oms.css

## ملفات أُعيدت كتابتها
returntab.js · readytodistribute.js

## ملفات عُدّلت
test.js · newordertab.js · date.js · tab.js · updateSearch.js · displayorder.js · exporttoexcel.js · index.html
(بقية الملفات منسوخة كما هي بنهايات أسطر LF)

## أول تشغيل
يُنشأ الـ users في Firebase تلقائياً بنفس المستخدمين القدامى وكلمة السر 123456،
وكل واحد يُجبَر على تغييرها عند أول دخول.

---

# تحديث: تاب Sales Report (قراءة شيت Premium Retail)

## ملفات جديدة
sales-parser.js · sales-report.js · sales.css

## ملفات عُدّلت (إضافات صغيرة فقط)
index.html — رابط sales.css، رابط "Sales Report" في القائمة الجانبية، `<div id="salesTab">`، وسكربتان قبل app-init.js
app-init.js — إغلاق تاب المبيعات عند فتح أي صفحة أخرى، `initSalesTab()` بعد تسجيل الدخول، وصفحة هبوط لمن صلاحيته المبيعات فقط

## الصلاحيات
المدير (manageUsers) يرى التاب تلقائياً. لإعطائه لغيره أضف صلاحية `viewSales` في قائمة الصلاحيات داخل users.js.

## رابط الشيت
في أعلى sales-report.js داخل `CONFIG.url` (يُحدَّث تلقائياً كل 5 دقائق، وزر Refresh للتحديث الفوري).

## القراءة مستقلة عن أسماء الأعمدة
sales-parser.js يقرأ الشيت من هيكله (صفوف فارغة تفصل الأقسام، عنوان القسم، صف الرؤوس، ثم البيانات).
إضافة منطقة جديدة أو براند جديد أو جدول جديد في الشيت تظهر تلقائياً بلا تعديل كود، وأي جدول غير معروف يظهر في "All sheet data".
