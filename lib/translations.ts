// Translation system for DreamBig Business OS
// Supports: English (en), Shona (sn), Ndebele (nd)

export type Language = 'en' | 'sn' | 'nd';

export interface Translations {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    back: string;
    next: string;
    done: string;
    close: string;
    yes: string;
    no: string;
  };
  
  // Auth
  auth: {
    signIn: string;
    signUp: string;
    signOut: string;
    email: string;
    password: string;
    confirmPassword: string;
    fullName: string;
    welcomeBack: string;
    signInToContinue: string;
    createAccount: string;
    joinDreamBig: string;
    alreadyHaveAccount: string;
    newToDreamBig: string;
    employeeLogin: string;
    forgotPassword: string;
  };
  
  // Settings
  settings: {
    title: string;
    appearance: string;
    darkMode: string;
    switchTheme: string;
    configurations: string;
    smsNotifications: string;
    sendPaymentReminders: string;
    emailNotifications: string;
    sendInvoicesReceipts: string;
    whatsappBusiness: string;
    sendInvoicesReminders: string;
    pushNotifications: string;
    receiveAlerts: string;
    language: string;
    defaultCurrency: string;
    preferredCurrency: string;
    businessProfile: string;
    exchangeRate: string;
    dataExport: string;
    exportAllData: string;
    active: string;
    inactive: string;
  };
  
  // Dashboard
  dashboard: {
    title: string;
    today: string;
    sales: string;
    expenses: string;
    profit: string;
    recentTransactions: string;
    alerts: string;
    topCategories: string;
    noTransactions: string;
    noAlerts: string;
  };
  
  // Finances
  finances: {
    title: string;
    addTransaction: string;
    sales: string;
    expenses: string;
    amount: string;
    description: string;
    category: string;
    date: string;
    total: string;
    editTransaction: string;
    deleteTransaction: string;
  };
  
  // Documents
  documents: {
    title: string;
    createDocument: string;
    invoice: string;
    receipt: string;
    quotation: string;
    purchaseOrder: string;
    noDocuments: string;
    customerName: string;
    total: string;
    status: string;
    date: string;
  };
  
  // Products
  products: {
    title: string;
    addProduct: string;
    productName: string;
    price: string;
    quantity: string;
    category: string;
    noProducts: string;
  };
  
  // Customers
  customers: {
    title: string;
    addCustomer: string;
    customerName: string;
    phone: string;
    email: string;
    noCustomers: string;
  };
  
  // General
  general: {
    businessName: string;
    owner: string;
    phone: string;
    address: string;
    location: string;
    currency: string;
    capital: string;
  };
}

const translations: Record<Language, Translations> = {
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      close: 'Close',
      yes: 'Yes',
      no: 'No',
    },
    auth: {
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      fullName: 'Full Name',
      welcomeBack: 'Welcome Back',
      signInToContinue: 'Sign in to continue',
      createAccount: 'Create Account',
      joinDreamBig: 'Join DreamBig Business OS',
      alreadyHaveAccount: 'Already have an account?',
      newToDreamBig: 'New to DreamBig?',
      employeeLogin: 'Employee Login',
      forgotPassword: 'Forgot Password?',
    },
    settings: {
      title: 'Settings',
      appearance: 'Appearance',
      darkMode: 'Dark Mode',
      switchTheme: 'Switch between light and dark theme',
      configurations: 'Configurations',
      smsNotifications: 'SMS Notifications',
      sendPaymentReminders: 'Send payment reminders via SMS',
      emailNotifications: 'Email Notifications',
      sendInvoicesReceipts: 'Send invoices and receipts via email',
      whatsappBusiness: 'WhatsApp Business',
      sendInvoicesReminders: 'Send invoices and reminders via WhatsApp',
      pushNotifications: 'Push Notifications',
      receiveAlerts: 'Receive alerts and reminders',
      language: 'Language',
      defaultCurrency: 'Default Currency',
      preferredCurrency: 'Preferred currency for new transactions',
      businessProfile: 'Business Profile',
      exchangeRate: 'Exchange Rate',
      dataExport: 'Data Export',
      exportAllData: 'Export all your business data for backup or analysis',
      active: 'Active',
      inactive: 'Inactive',
    },
    dashboard: {
      title: 'Dashboard',
      today: 'Today',
      sales: 'Sales',
      expenses: 'Expenses',
      profit: 'Profit',
      recentTransactions: 'Recent Transactions',
      alerts: 'Alerts',
      topCategories: 'Top Categories',
      noTransactions: 'No transactions yet',
      noAlerts: 'No alerts',
    },
    finances: {
      title: 'Finances',
      addTransaction: 'Add Transaction',
      sales: 'Sales',
      expenses: 'Expenses',
      amount: 'Amount',
      description: 'Description',
      category: 'Category',
      date: 'Date',
      total: 'Total',
      editTransaction: 'Edit Transaction',
      deleteTransaction: 'Delete Transaction',
    },
    documents: {
      title: 'Documents',
      createDocument: 'Create Document',
      invoice: 'Invoice',
      receipt: 'Receipt',
      quotation: 'Quotation',
      purchaseOrder: 'Purchase Order',
      noDocuments: 'No documents yet',
      customerName: 'Customer Name',
      total: 'Total',
      status: 'Status',
      date: 'Date',
    },
    products: {
      title: 'Products',
      addProduct: 'Add Product',
      productName: 'Product Name',
      price: 'Price',
      quantity: 'Quantity',
      category: 'Category',
      noProducts: 'No products yet',
    },
    customers: {
      title: 'Customers',
      addCustomer: 'Add Customer',
      customerName: 'Customer Name',
      phone: 'Phone',
      email: 'Email',
      noCustomers: 'No customers yet',
    },
    general: {
      businessName: 'Business Name',
      owner: 'Owner',
      phone: 'Phone',
      address: 'Address',
      location: 'Location',
      currency: 'Currency',
      capital: 'Capital',
    },
  },
  
  sn: {
    common: {
      save: 'Chengetedza',
      cancel: 'Kanzura',
      delete: 'Delete',
      edit: 'Gadzirisa',
      add: 'Wedzera',
      search: 'Tsvaga',
      loading: 'Ari kurodha...',
      error: 'Kukanganisa',
      success: 'Kubudirira',
      confirm: 'Simbisa',
      back: 'Shure',
      next: 'Mberi',
      done: 'Zvaitwa',
      close: 'Vhara',
      yes: 'Ehe',
      no: 'Aiwa',
    },
    auth: {
      signIn: 'Pinda',
      signUp: 'Nyoresa',
      signOut: 'Budisa',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Simbisa Password',
      fullName: 'Zita Rizere',
      welcomeBack: 'Mauya Zvakare',
      signInToContinue: 'Pinda kuti uenderere mberi',
      createAccount: 'Gadzira Account',
      joinDreamBig: 'Joinana neDreamBig Business OS',
      alreadyHaveAccount: 'Une account here?',
      newToDreamBig: 'Uchitsva kuDreamBig?',
      employeeLogin: 'Mushandi Login',
      forgotPassword: 'Wakanganwa Password?',
    },
    settings: {
      title: 'Zvido',
      appearance: 'Chitarisiko',
      darkMode: 'Dark Mode',
      switchTheme: 'Shandura pakati pechiedza nedema',
      configurations: 'Zvido',
      smsNotifications: 'SMS Ziviso',
      sendPaymentReminders: 'Tumira ziviso zvepayment neSMS',
      emailNotifications: 'Email Ziviso',
      sendInvoicesReceipts: 'Tumira invoices nemareceipts neemail',
      whatsappBusiness: 'WhatsApp Business',
      sendInvoicesReminders: 'Tumira invoices neziviso neWhatsApp',
      pushNotifications: 'Push Ziviso',
      receiveAlerts: 'Gamuchira ziviso neziviso',
      language: 'Mutauro',
      defaultCurrency: 'Mari Yekutanga',
      preferredCurrency: 'Mari yaunofarira yezvibvumirano zvitsva',
      businessProfile: 'Business Profile',
      exchangeRate: 'Exchange Rate',
      dataExport: 'Kuburitsa Data',
      exportAllData: 'Buritsa data yako yese yebhizinesi kuitira backup kana kuongorora',
      active: 'Active',
      inactive: 'Inactive',
    },
    dashboard: {
      title: 'Dashboard',
      today: 'Nhasi',
      sales: 'Kutengesa',
      expenses: 'Mari Yabuda',
      profit: 'Purofiti',
      recentTransactions: 'Zvibvumirano Zvenguva Pfupi',
      alerts: 'Ziviso',
      topCategories: 'Zvikamu Zvepamusoro',
      noTransactions: 'Hapana zvibvumirano parizvino',
      noAlerts: 'Hapana ziviso',
    },
    finances: {
      title: 'Mari',
      addTransaction: 'Wedzera Chibvumirano',
      sales: 'Kutengesa',
      expenses: 'Mari Yabuda',
      amount: 'Mari',
      description: 'Tsanangudzo',
      category: 'Chikamu',
      date: 'Zuva',
      total: 'Zvose',
      editTransaction: 'Gadzirisa Chibvumirano',
      deleteTransaction: 'Delete Chibvumirano',
    },
    documents: {
      title: 'Zvinyorwa',
      createDocument: 'Gadzira Gwaro',
      invoice: 'Invoice',
      receipt: 'Receipt',
      quotation: 'Quotation',
      purchaseOrder: 'Purchase Order',
      noDocuments: 'Hapana zvinyorwa parizvino',
      customerName: 'Zita Remutengi',
      total: 'Zvose',
      status: 'Mamiriro',
      date: 'Zuva',
    },
    products: {
      title: 'Zvigadzirwa',
      addProduct: 'Wedzera Chigadzirwa',
      productName: 'Zita Rechigadzirwa',
      price: 'Mutengo',
      quantity: 'Uwandu',
      category: 'Chikamu',
      noProducts: 'Hapana zvigadzirwa parizvino',
    },
    customers: {
      title: 'Vatengi',
      addCustomer: 'Wedzera Mutengi',
      customerName: 'Zita Remutengi',
      phone: 'Foni',
      email: 'Email',
      noCustomers: 'Hapana vatengi parizvino',
    },
    general: {
      businessName: 'Zita Rebhizinesi',
      owner: 'Muridzi',
      phone: 'Foni',
      address: 'Kero',
      location: 'Nzvimbo',
      currency: 'Mari',
      capital: 'Capital',
    },
  },
  
  nd: {
    common: {
      save: 'Gcina',
      cancel: 'Khansela',
      delete: 'Susa',
      edit: 'Hlela',
      add: 'Engeza',
      search: 'Sesha',
      loading: 'Iyalayisha...',
      error: 'Iphutha',
      success: 'Impumelelo',
      confirm: 'Qinisekisa',
      back: 'Emuva',
      next: 'Okulandelayo',
      done: 'Kwenziwe',
      close: 'Vala',
      yes: 'Yebo',
      no: 'Cha',
    },
    auth: {
      signIn: 'Ngena',
      signUp: 'Bhalisa',
      signOut: 'Phuma',
      email: 'I-Email',
      password: 'I-Password',
      confirmPassword: 'Qinisekisa I-Password',
      fullName: 'Igama Eliphelele',
      welcomeBack: 'Wamukelekile Futhi',
      signInToContinue: 'Ngena ukuze uqhubeke',
      createAccount: 'Dala I-Account',
      joinDreamBig: 'Joyina I-DreamBig Business OS',
      alreadyHaveAccount: 'Unayo i-account?',
      newToDreamBig: 'Umusha kuDreamBig?',
      employeeLogin: 'I-Employee Login',
      forgotPassword: 'Ukhohlwe I-Password?',
    },
    settings: {
      title: 'Izilungiselelo',
      appearance: 'Ukubonakala',
      darkMode: 'I-Dark Mode',
      switchTheme: 'Shintsha phakathi kokukhanya nobumnyama',
      configurations: 'Izilungiselelo',
      smsNotifications: 'Izaziso Ze-SMS',
      sendPaymentReminders: 'Thumela izikhumbuzo ze-payment nge-SMS',
      emailNotifications: 'Izaziso Ze-Email',
      sendInvoicesReceipts: 'Thumela ama-invoice nama-receipt nge-email',
      whatsappBusiness: 'I-WhatsApp Business',
      sendInvoicesReminders: 'Thumela ama-invoice nezikhumbuzo nge-WhatsApp',
      pushNotifications: 'Izaziso Ze-Push',
      receiveAlerts: 'Thola izaziso nezikhumbuzo',
      language: 'Ulimi',
      defaultCurrency: 'Imali Ekuqaleni',
      preferredCurrency: 'Imali oyithandayo yezentengiselwano ezintsha',
      businessProfile: 'I-Business Profile',
      exchangeRate: 'I-Exchange Rate',
      dataExport: 'Ukukhipha Idatha',
      exportAllData: 'Khipha yonke idatha yakho yebhizinisi ukuze ube ne-backup noma ukuhlaziya',
      active: 'Active',
      inactive: 'Inactive',
    },
    dashboard: {
      title: 'I-Dashboard',
      today: 'Namuhla',
      sales: 'Ukuthengisa',
      expenses: 'Izindleko',
      profit: 'Inzuzo',
      recentTransactions: 'Izintengiselwano Zakamuva',
      alerts: 'Izaziso',
      topCategories: 'Izigaba Eziphezulu',
      noTransactions: 'Azikho izintengiselwano okwamanje',
      noAlerts: 'Azikho izaziso',
    },
    finances: {
      title: 'Imali',
      addTransaction: 'Engeza Intengiselwano',
      sales: 'Ukuthengisa',
      expenses: 'Izindleko',
      amount: 'Inani',
      description: 'Incazelo',
      category: 'Isigaba',
      date: 'Usuku',
      total: 'Isamba',
      editTransaction: 'Hlela Intengiselwano',
      deleteTransaction: 'Susa Intengiselwano',
    },
    documents: {
      title: 'Amadokhumenti',
      createDocument: 'Dala Idokhumenti',
      invoice: 'I-Invoice',
      receipt: 'I-Receipt',
      quotation: 'I-Quotation',
      purchaseOrder: 'I-Purchase Order',
      noDocuments: 'Azikho amadokhumenti okwamanje',
      customerName: 'Igama Lekhasimende',
      total: 'Isamba',
      status: 'Isimo',
      date: 'Usuku',
    },
    products: {
      title: 'Imikhiqizo',
      addProduct: 'Engeza Umkhiqizo',
      productName: 'Igama Lomkhiqizo',
      price: 'Intengo',
      quantity: 'Ubuningi',
      category: 'Isigaba',
      noProducts: 'Azikho imikhiqizo okwamanje',
    },
    customers: {
      title: 'Amakhasimende',
      addCustomer: 'Engeza Ikhasimende',
      customerName: 'Igama Lekhasimende',
      phone: 'Ifoni',
      email: 'I-Email',
      noCustomers: 'Azikho amakhasimende okwamanje',
    },
    general: {
      businessName: 'Igama Lebhizinisi',
      owner: 'Umnini',
      phone: 'Ifoni',
      address: 'Ikheli',
      location: 'Indawo',
      currency: 'Imali',
      capital: 'I-Capital',
    },
  },
};

export function getTranslations(language: Language): Translations {
  return translations[language] || translations.en;
}

export function t(key: string, language: Language = 'en'): string {
  const keys = key.split('.');
  const trans = getTranslations(language);
  let value: any = trans;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if translation not found
      const enTrans = getTranslations('en');
      let enValue: any = enTrans;
      for (const enK of keys) {
        if (enValue && typeof enValue === 'object' && enK in enValue) {
          enValue = enValue[enK];
        } else {
          return key; // Return key if not found in English either
        }
      }
      return typeof enValue === 'string' ? enValue : key;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

