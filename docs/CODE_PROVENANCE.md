# منشأ الشيفرة والاعتماديات — M0

كُتبت ملفات M0 في هذا المستودع لهذه المرحلة. لم تُنسخ ملفات أو خوارزميات من
Hidjri_Calendar أو AppHub، ولم تُنسخ بيانات بدايات الأشهر أو مواقيت خارجية.
لم تُعدّل المستودعات المرجعية. إعادة استخدام منطق الهجري مؤجلة إلى M2 بعد حسم
الترخيص وتوثيق الإصدار والتعديلات؛ لم يُعثر على ترخيص صريح في المرجع أثناء الدراسة.

مراجع واجهات البرمجة المستخدمة:

- https://gjs.guide/extensions/development/creating.html
- https://gjs.guide/extensions/topics/popup-menu.html
- https://gjs.guide/extensions/review-guidelines/review-guidelines.html
- https://gjs.guide/extensions/development/debugging.html

هذه مراجع لاستعمال واجهات GNOME القياسية وليست ملفات مضمّنة في الحزمة.
توثيق gjs.guide يعلن MIT؛ لم ننسخ ملفًا منه. تعتمد الإضافة وقت التشغيل على
GJS وGNOME Shell وGLib وSt وClutter وPango الموجودة في النظام؛ لا تُضمّن
نسخًا من مكتباتها ولا تضيف اعتماديات npm/Python خارج المكتبة القياسية.

الأوقات التجريبية منشؤها المحلي موثّق في `sources/README.md`. لا تتضمن الحزمة
شيفرة التقويم المرجعي أو واجهة ويب أو مشغّل شبكة أو ملفات المستخدم الخاصة.
