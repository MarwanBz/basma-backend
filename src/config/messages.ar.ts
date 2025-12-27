/**
 * Arabic Message Catalog
 * All user-facing messages in Arabic for API responses
 */

export const messages = {
  // ================== SUCCESS MESSAGES ==================
  success: {
    // General
    default: "تمت العملية بنجاح",

    // Auth
    userCreated: "تم إنشاء المستخدم بنجاح",
    loggedOut: "تم تسجيل الخروج بنجاح",
    emailVerified: "تم التحقق من البريد الإلكتروني بنجاح",
    passwordReset: "تم إعادة تعيين كلمة المرور بنجاح",
    verificationEmailSent: "تم إرسال رسالة التحقق بنجاح",
    passwordResetEmailSent: "تم إرسال رابط إعادة تعيين كلمة المرور",

    // Users
    userDeleted: "تم حذف المستخدم بنجاح",
    userUpdated: "تم تحديث بيانات المستخدم بنجاح",
    profileRetrieved: "تم استرداد الملف الشخصي بنجاح",

    // Requests
    requestCreated: "تم إنشاء الطلب بنجاح",
    requestUpdated: "تم تحديث الطلب بنجاح",
    requestDeleted: "تم حذف الطلب بنجاح",
    requestAssigned: "تم تعيين الطلب بنجاح",
    statusUpdated: "تم تحديث الحالة بنجاح",
    commentAdded: "تم إضافة التعليق بنجاح",

    // Categories
    categoriesRetrieved: "تم استرداد الفئات بنجاح",
    categoryRetrieved: "تم استرداد الفئة بنجاح",
    categoryCreated: "تم إنشاء الفئة بنجاح",
    categoryUpdated: "تم تحديث الفئة بنجاح",
    categoryDeleted: "تم حذف الفئة بنجاح",

    // Buildings
    buildingConfigDeleted: "تم حذف إعدادات المبنى بنجاح",
    buildingConfigUpdated: "تم تحديث إعدادات المبنى بنجاح",
    buildingConfigCreated: "تم إنشاء إعدادات المبنى بنجاح",

    // Files
    fileUploaded: "تم رفع الملف بنجاح",
    filesUploaded: "تم رفع الملفات بنجاح",
    downloadUrlGenerated: "تم إنشاء رابط التحميل بنجاح",
    fileDeleted: "تم حذف الملف بنجاح",
    filesRetrieved: "تم استرداد الملفات بنجاح",
    fileRetrieved: "تم استرداد الملف بنجاح",
    fileMetadataUpdated: "تم تحديث بيانات الملف بنجاح",

    // Notifications
    deviceRegistered: "تم تسجيل الجهاز بنجاح",
    deviceUnregistered: "تم إلغاء تسجيل الجهاز بنجاح",
    announcementSent: "تم إرسال الإعلان بنجاح",
    testNotificationSent: "تم إرسال إشعار الاختبار بنجاح",
    notificationsRetrieved: "تم استرداد الإشعارات بنجاح",
    notificationMarkedRead: "تم تحديد الإشعار كمقروء",
    allNotificationsMarkedRead: "تم تحديد جميع الإشعارات كمقروءة",

    // Technicians
    technicianCreated: "تم إنشاء الفني بنجاح",
    technicianUpdated: "تم تحديث بيانات الفني بنجاح",
    technicianDeleted: "تم حذف الفني بنجاح",
  },

  // ================== ERROR MESSAGES ==================
  errors: {
    // General
    internalServerError: "حدث خطأ داخلي في الخادم",
    serviceUnavailable: "الخدمة غير متوفرة حالياً",
    validationFailed: "فشل التحقق من البيانات",
    invalidRequestData: "بيانات الطلب غير صالحة",

    // Authentication
    unauthorized: "غير مصرح",
    notAuthenticated: "لم يتم المصادقة",
    userNotAuthenticated: "المستخدم غير مصادق",
    invalidCredentials: "بيانات الاعتماد غير صالحة",
    noTokenProvided: "لم يتم توفير رمز المصادقة",
    invalidToken: "رمز المصادقة غير صالح",
    tokenExpired: "انتهت صلاحية رمز المصادقة",
    invalidRefreshToken: "رمز التحديث غير صالح",
    emailNotVerified: "البريد الإلكتروني غير محقق",
    accountDisabled: "الحساب معطل",

    // Authorization
    accessDenied: "تم رفض الوصول",
    forbidden: "غير مسموح",
    notAuthorizedToAccessProfile: "غير مصرح بالوصول إلى هذا الملف الشخصي",
    insufficientPermissions: "صلاحيات غير كافية",
    adminPrivilegesRequired: "مطلوب صلاحيات المسؤول",
    onlyAdminsCanSendAnnouncements: "يمكن للمسؤولين فقط إرسال الإعلانات",

    // Resource Not Found
    userNotFound: "المستخدم غير موجود",
    requestNotFound: "الطلب غير موجود",
    fileNotFound: "الملف غير موجود",
    categoryNotFound: "الفئة غير موجودة",
    buildingConfigNotFound: "إعدادات المبنى غير موجودة",
    resourceNotFound: "المورد غير موجود",

    // Already Exists
    emailAlreadyExists: "البريد الإلكتروني مستخدم بالفعل",
    phoneAlreadyExists: "رقم الهاتف مستخدم بالفعل",
    resourceAlreadyExists: "المورد موجود بالفعل",

    // Validation
    missingRequiredFields: "حقول مطلوبة مفقودة",
    nameEmailPasswordRoleRequired:
      "الاسم والبريد الإلكتروني وكلمة المرور والدور مطلوبة",
    updatesMustBeArray: "يجب أن تكون التحديثات على شكل مصفوفة",
    userIdsMustBeArray: "يجب أن تكون معرفات المستخدمين على شكل مصفوفة",
    userIdRequired: "معرف المستخدم مطلوب",
    emailOrIdentifierRequired: "البريد الإلكتروني أو المعرف مطلوب",

    // Files
    noFileProvided: "لم يتم توفير ملف",
    noFilesProvided: "لم يتم توفير ملفات",
    fileKeyRequired: "مفتاح الملف مطلوب",
    entityTypeAndIdRequired: "نوع الكيان والمعرف مطلوبان",
    invalidEntityType: "نوع الكيان غير صالح",
    fileSizeExceedsLimit: "حجم الملف يتجاوز الحد المسموح",
    failedToUploadFile: "فشل في رفع الملف",
    failedToDeleteFile: "فشل في حذف الملف",
    failedToGenerateDownloadUrl: "فشل في إنشاء رابط التحميل",
    failedToRetrieveFiles: "فشل في استرداد الملفات",
    fileHasExpired: "انتهت صلاحية الملف",
    storageBucketNotExist: "حاوية التخزين غير موجودة",
    accessDeniedToStorage: "تم رفض الوصول إلى خدمة التخزين",
    fileSizeExceedsStorageLimit: "حجم الملف يتجاوز حد التخزين",

    // Notifications
    topicDeprecated: "الموضوع مهجور",
    userIdOrTopicRequired: "يجب توفير معرف المستخدم أو الموضوع",
    testEndpointNotInProduction: "نقطة الاختبار غير متاحة في بيئة الإنتاج",
    failedToSubscribeToTopic: "فشل في الاشتراك بالموضوع",
    failedToUnsubscribeFromTopic: "فشل في إلغاء الاشتراك من الموضوع",

    // Requests
    invalidTechnician: "الفني غير صالح",
    requestAlreadyAssigned: "الطلب معين بالفعل",
    cannotUpdateCompletedRequest: "لا يمكن تحديث طلب مكتمل",

    // Database
    databaseError: "خطأ في قاعدة البيانات",
    dbConnectionError: "خطأ في الاتصال بقاعدة البيانات",
    dbQueryError: "خطأ في استعلام قاعدة البيانات",
  },

  // ================== VALIDATION MESSAGES ==================
  validation: {
    // General
    fieldRequired: "هذا الحقل مطلوب",
    invalidFormat: "تنسيق غير صالح",

    // Password
    passwordMinLength: "يجب أن تكون كلمة المرور 8 أحرف على الأقل",
    passwordRequirements:
      "يجب أن تحتوي كلمة المرور على حرف كبير وحرف صغير ورقم وحرف خاص واحد على الأقل",

    // Email
    invalidEmailAddress: "عنوان البريد الإلكتروني غير صالح",

    // Phone
    invalidPhoneNumber: "رقم الهاتف غير صالح",
    phoneLength: "يجب أن يكون رقم الهاتف 9 أرقام",

    // Name
    nameMinLength: "يجب أن يكون الاسم حرفين على الأقل",
    nameMaxLength: "يجب ألا يتجاوز الاسم 99 حرفاً",

    // Token
    refreshTokenRequired: "رمز التحديث مطلوب",
    verificationTokenRequired: "رمز التحقق مطلوب",
    resetTokenRequired: "رمز إعادة التعيين مطلوب",
  },

  // ================== EMAIL TEMPLATES ==================
  email: {
    verification: {
      subject: "تأكيد البريد الإلكتروني - بصمة",
      greeting: "مرحباً",
      thankYou:
        "شكراً لتسجيلك! يرجى تأكيد بريدك الإلكتروني بالنقر على الزر أدناه:",
      buttonText: "تأكيد البريد الإلكتروني",
      copyLink: "أو انسخ والصق هذا الرابط في متصفحك:",
      expiry: "سينتهي هذا الرابط خلال 24 ساعة.",
      ignore: "إذا لم تقم بإنشاء حساب، يرجى تجاهل هذا البريد.",
      automated: "هذه رسالة آلية، يرجى عدم الرد عليها.",
    },
    passwordReset: {
      subject: "إعادة تعيين كلمة المرور - بصمة",
      greeting: "مرحباً",
      requested:
        "لقد طلبت إعادة تعيين كلمة المرور. انقر على الزر أدناه لإعادة تعيينها:",
      buttonText: "إعادة تعيين كلمة المرور",
      copyLink: "أو انسخ والصق هذا الرابط في متصفحك:",
      expiry: "سينتهي هذا الرابط خلال ساعة واحدة.",
      ignore: "إذا لم تطلب هذا، يرجى تجاهل هذا البريد.",
      unchanged: "ستبقى كلمة المرور الخاصة بك دون تغيير.",
    },
  },

  // ================== NOTIFICATIONS ==================
  notifications: {
    requestCreated: {
      title: "طلب صيانة جديد",
      body: "تم إنشاء طلب صيانة جديد",
    },
    requestAssigned: {
      title: "تم تعيين طلب",
      body: "تم تعيين طلب صيانة لك",
    },
    requestStatusUpdated: {
      title: "تحديث حالة الطلب",
      body: "تم تحديث حالة طلب الصيانة الخاص بك",
    },
    requestCompleted: {
      title: "اكتمال الطلب",
      body: "تم إكمال طلب الصيانة الخاص بك",
    },
    newComment: {
      title: "تعليق جديد",
      body: "تم إضافة تعليق جديد على طلبك",
    },
  },
} as const;

// Type for message keys
export type MessageKey = keyof typeof messages;
export type SuccessMessageKey = keyof typeof messages.success;
export type ErrorMessageKey = keyof typeof messages.errors;
export type ValidationMessageKey = keyof typeof messages.validation;
