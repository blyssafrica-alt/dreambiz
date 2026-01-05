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
    filter: string;
    export: string;
    import: string;
    download: string;
    upload: string;
    select: string;
    all: string;
    none: string;
    today: string;
    week: string;
    month: string;
    year: string;
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
    subtitle: string;
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
    filter: string;
    export: string;
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
    draft: string;
    sent: string;
    paid: string;
    cancelled: string;
    overdue: string;
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
    costPrice: string;
    sellingPrice: string;
    stock: string;
    lowStock: string;
    outOfStock: string;
  };
  
  // Customers
  customers: {
    title: string;
    subtitle: string;
    addCustomer: string;
    customerName: string;
    phone: string;
    email: string;
    noCustomers: string;
    address: string;
    totalSpent: string;
    lastPurchase: string;
  };
  
  // Suppliers
  suppliers: {
    title: string;
    subtitle: string;
    addSupplier: string;
    supplierName: string;
    phone: string;
    email: string;
    noSuppliers: string;
    address: string;
    totalSpent: string;
    lastOrder: string;
  };
  
  // Reports
  reports: {
    title: string;
    subtitle: string;
    profitLoss: string;
    totalSales: string;
    totalExpenses: string;
    netProfit: string;
    margin: string;
    dailyTrends: string;
    salesByCategory: string;
    expensesByCategory: string;
    topSalesCategories: string;
    topExpenseCategories: string;
    balanceSheet: string;
    assets: string;
    liabilities: string;
    netWorth: string;
    cashflowStatement: string;
    operatingActivities: string;
    investingActivities: string;
    netChangeInCash: string;
    invoiceStatus: string;
    totalInvoiced: string;
    paid: string;
    outstanding: string;
    exportReports: string;
    summaryReport: string;
    detailedReport: string;
  };
  
  // Budgets
  budgets: {
    title: string;
    subtitle: string;
    addBudget: string;
    budgetName: string;
    period: string;
    totalBudget: string;
    spent: string;
    remaining: string;
    status: string;
    noBudgets: string;
    overBudget: string;
    onTrack: string;
  };
  
  // Cashflow
  cashflow: {
    title: string;
    subtitle: string;
    addProjection: string;
    month: string;
    income: string;
    expenses: string;
    netCashflow: string;
    closingBalance: string;
    noProjections: string;
  };
  
  // Projects
  projects: {
    title: string;
    addProject: string;
    projectName: string;
    clientName: string;
    status: string;
    startDate: string;
    endDate: string;
    budget: string;
    progress: string;
    notes: string;
    noProjects: string;
    planning: string;
    active: string;
    onHold: string;
    completed: string;
    cancelled: string;
  };
  
  // Employees
  employees: {
    title: string;
    addEmployee: string;
    employeeName: string;
    phone: string;
    email: string;
    role: string;
    noEmployees: string;
    active: string;
    inactive: string;
  };
  
  // Tax
  tax: {
    title: string;
    subtitle: string;
    addRate: string;
    rateName: string;
    rate: string;
    defaultRate: string;
    noRates: string;
    manageTaxRates: string;
  };
  
  // Accounts
  accounts: {
    title: string;
    subtitle: string;
    receivable: string;
    payable: string;
    accountsReceivable: string;
    accountsPayable: string;
    noReceivables: string;
    noPayables: string;
  };
  
  // POS
  pos: {
    title: string;
    openShift: string;
    closeShift: string;
    shiftOpen: string;
    shiftStarted: string;
    addToCart: string;
    removeFromCart: string;
    checkout: string;
    paymentMethod: string;
    cash: string;
    card: string;
    mobileMoney: string;
    bankTransfer: string;
    total: string;
    change: string;
    receipt: string;
  };
  
  // Appointments
  appointments: {
    title: string;
    addAppointment: string;
    clientName: string;
    service: string;
    date: string;
    time: string;
    status: string;
    noAppointments: string;
    upcoming: string;
    completed: string;
    cancelled: string;
  };
  
  // Recurring Invoices
  recurringInvoices: {
    title: string;
    subtitle: string;
    addRecurringInvoice: string;
    invoiceName: string;
    customer: string;
    amount: string;
    frequency: string;
    startDate: string;
    endDate: string;
    status: string;
    noRecurringInvoices: string;
    active: string;
    paused: string;
    completed: string;
  };
  
  // Calculator
  calculator: {
    title: string;
    subtitle: string;
    calculate: string;
    monthlyRevenue: string;
    monthlyExpenses: string;
    profitability: string;
    viable: string;
    notViable: string;
    breakEven: string;
  };
  
  // Businesses
  businesses: {
    title: string;
    subtitle: string;
    addBusiness: string;
    businessType: string;
    businessStage: string;
    location: string;
    noBusinesses: string;
    switchBusiness: string;
    deleteBusiness: string;
    cannotDelete: string;
    cannotDeleteActive: string;
    businessDeleted: string;
    retail: string;
    services: string;
    restaurant: string;
    salon: string;
    agriculture: string;
    construction: string;
    transport: string;
    manufacturing: string;
    other: string;
    running: string;
    growing: string;
    planning: string;
  };
  
  // Admin
  admin: {
    adminConsole: string;
    platformStatistics: string;
    totalUsers: string;
    activeUsers: string;
    totalProducts: string;
    totalAds: string;
    totalBusinesses: string;
    totalRevenue: string;
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
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      download: 'Download',
      upload: 'Upload',
      select: 'Select',
      all: 'All',
      none: 'None',
      today: 'Today',
      week: 'Week',
      month: 'Month',
      year: 'Year',
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
      subtitle: 'Track sales, expenses, and profit',
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
      filter: 'Filter',
      export: 'Export',
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
      draft: 'Draft',
      sent: 'Sent',
      paid: 'Paid',
      cancelled: 'Cancelled',
      overdue: 'Overdue',
    },
    products: {
      title: 'Products',
      addProduct: 'Add Product',
      productName: 'Product Name',
      price: 'Price',
      quantity: 'Quantity',
      category: 'Category',
      noProducts: 'No products yet',
      costPrice: 'Cost Price',
      sellingPrice: 'Selling Price',
      stock: 'Stock',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
    },
    customers: {
      title: 'Customers',
      addCustomer: 'Add Customer',
      customerName: 'Customer Name',
      phone: 'Phone',
      email: 'Email',
      noCustomers: 'No customers yet',
      address: 'Address',
      totalSpent: 'Total Spent',
      lastPurchase: 'Last Purchase',
    },
    suppliers: {
      title: 'Suppliers',
      subtitle: 'Manage your supplier relationships',
      addSupplier: 'Add Supplier',
      supplierName: 'Supplier Name',
      phone: 'Phone',
      email: 'Email',
      noSuppliers: 'No suppliers yet',
      address: 'Address',
      totalSpent: 'Total Spent',
      lastOrder: 'Last Order',
    },
    reports: {
      title: 'Reports',
      subtitle: 'Business analytics and insights',
      profitLoss: 'Profit & Loss',
      totalSales: 'Total Sales',
      totalExpenses: 'Total Expenses',
      netProfit: 'Net Profit',
      margin: 'Margin',
      dailyTrends: 'Daily Trends',
      salesByCategory: 'Sales by Category',
      expensesByCategory: 'Expenses by Category',
      topSalesCategories: 'Top Sales Categories',
      topExpenseCategories: 'Top Expense Categories',
      balanceSheet: 'Balance Sheet',
      assets: 'Assets',
      liabilities: 'Liabilities',
      netWorth: 'Net Worth (Equity)',
      cashflowStatement: 'Cashflow Statement',
      operatingActivities: 'Operating Activities',
      investingActivities: 'Investing Activities',
      netChangeInCash: 'Net Change in Cash',
      invoiceStatus: 'Invoice Status',
      totalInvoiced: 'Total Invoiced',
      paid: 'Paid',
      outstanding: 'Outstanding',
      exportReports: 'Export Reports',
      summaryReport: 'Summary Report',
      detailedReport: 'Detailed Report',
    },
    budgets: {
      title: 'Budgets',
      subtitle: 'Plan and track your spending',
      addBudget: 'Add Budget',
      budgetName: 'Budget Name',
      period: 'Period',
      totalBudget: 'Total Budget',
      spent: 'Spent',
      remaining: 'Remaining',
      status: 'Status',
      noBudgets: 'No budgets yet',
      overBudget: 'Over Budget',
      onTrack: 'On Track',
    },
    cashflow: {
      title: 'Cashflow Projections',
      subtitle: 'Track your cash flow trends',
      addProjection: 'Add Projection',
      month: 'Month',
      income: 'Income',
      expenses: 'Expenses',
      netCashflow: 'Net Cashflow',
      closingBalance: 'Closing Balance',
      noProjections: 'No projections yet',
    },
    projects: {
      title: 'Projects',
      addProject: 'Add Project',
      projectName: 'Project Name',
      clientName: 'Client Name',
      status: 'Status',
      startDate: 'Start Date',
      endDate: 'End Date',
      budget: 'Budget',
      progress: 'Progress',
      notes: 'Notes',
      noProjects: 'No projects yet',
      planning: 'Planning',
      active: 'Active',
      onHold: 'On Hold',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    employees: {
      title: 'Employees',
      addEmployee: 'Add Employee',
      employeeName: 'Employee Name',
      phone: 'Phone',
      email: 'Email',
      role: 'Role',
      noEmployees: 'No employees yet',
      active: 'Active',
      inactive: 'Inactive',
    },
    tax: {
      title: 'Tax Management',
      subtitle: 'Manage tax rates',
      addRate: 'Add Rate',
      rateName: 'Rate Name',
      rate: 'Rate',
      defaultRate: 'Default',
      noRates: 'No tax rates yet',
      manageTaxRates: 'Manage tax rates',
    },
    accounts: {
      title: 'Accounts',
      subtitle: 'Track money owed to and by you',
      receivable: 'Receivable',
      payable: 'Payable',
      accountsReceivable: 'Accounts Receivable',
      accountsPayable: 'Accounts Payable',
      noReceivables: 'No receivables yet',
      noPayables: 'No payables yet',
    },
    pos: {
      title: 'Point of Sale',
      openShift: 'Open Shift',
      closeShift: 'Close Shift',
      shiftOpen: 'Shift Open',
      shiftStarted: 'Started',
      addToCart: 'Add to Cart',
      removeFromCart: 'Remove from Cart',
      checkout: 'Checkout',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      card: 'Card',
      mobileMoney: 'Mobile Money',
      bankTransfer: 'Bank Transfer',
      total: 'Total',
      change: 'Change',
      receipt: 'Receipt',
    },
    appointments: {
      title: 'Appointments',
      addAppointment: 'Add Appointment',
      clientName: 'Client Name',
      service: 'Service',
      date: 'Date',
      time: 'Time',
      status: 'Status',
      noAppointments: 'No appointments yet',
      upcoming: 'upcoming',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    recurringInvoices: {
      title: 'Recurring Invoices',
      subtitle: 'Automate your billing cycle',
      addRecurringInvoice: 'Add Recurring Invoice',
      invoiceName: 'Invoice Name',
      customer: 'Customer',
      amount: 'Amount',
      frequency: 'Frequency',
      startDate: 'Start Date',
      endDate: 'End Date',
      status: 'Status',
      noRecurringInvoices: 'No recurring invoices yet',
      active: 'Active',
      paused: 'Paused',
      completed: 'Completed',
    },
    calculator: {
      title: 'Business Viability Check',
      subtitle: 'Calculate if your business model is profitable',
      calculate: 'Calculate',
      monthlyRevenue: 'Monthly Revenue',
      monthlyExpenses: 'Monthly Expenses',
      profitability: 'Profitability',
      viable: 'Viable',
      notViable: 'Not Viable',
      breakEven: 'Break Even',
    },
    businesses: {
      title: 'My Businesses',
      subtitle: 'Manage multiple businesses from one account',
      addBusiness: 'Add Business',
      businessType: 'Business Type',
      businessStage: 'Business Stage',
      location: 'Location',
      noBusinesses: 'No businesses yet',
      switchBusiness: 'Switch Business',
      deleteBusiness: 'Delete Business',
      cannotDelete: 'Cannot Delete',
      cannotDeleteActive: 'Cannot delete the currently active business. Please switch to another business first.',
      businessDeleted: 'Business deleted successfully',
      retail: 'Retail Shop',
      services: 'Services',
      restaurant: 'Restaurant/Food',
      salon: 'Salon/Beauty',
      agriculture: 'Agriculture',
      construction: 'Construction',
      transport: 'Transport',
      manufacturing: 'Manufacturing',
      other: 'Other',
      running: 'Running',
      growing: 'Growing',
      planning: 'Planning',
    },
    admin: {
      adminConsole: 'Admin Console',
      platformStatistics: 'Platform Statistics',
      totalUsers: 'Total Users',
      activeUsers: 'Active Users',
      totalProducts: 'Total Products',
      totalAds: 'Total Ads',
      totalBusinesses: 'Total Businesses',
      totalRevenue: 'Total Revenue',
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
      filter: 'Sefa',
      export: 'Buritsa',
      import: 'Pinza',
      download: 'Dhaunirodha',
      upload: 'Isa',
      select: 'Sarudza',
      all: 'Zvose',
      none: 'Hapana',
      today: 'Nhasi',
      week: 'Vhiki',
      month: 'Mwedzi',
      year: 'Gore',
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
      subtitle: 'Tevera kutengesa, mari yabuda, uye purofiti',
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
      filter: 'Sefa',
      export: 'Buritsa',
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
      draft: 'Draft',
      sent: 'Tumirwa',
      paid: 'Kubhadharwa',
      cancelled: 'Kanzurwa',
      overdue: 'Nguva Yapfuura',
    },
    products: {
      title: 'Zvigadzirwa',
      addProduct: 'Wedzera Chigadzirwa',
      productName: 'Zita Rechigadzirwa',
      price: 'Mutengo',
      quantity: 'Uwandu',
      category: 'Chikamu',
      noProducts: 'Hapana zvigadzirwa parizvino',
      costPrice: 'Mutengo Wekutenga',
      sellingPrice: 'Mutengo Wekutengesa',
      stock: 'Stock',
      lowStock: 'Stock Yakaderera',
      outOfStock: 'Hapana Stock',
    },
    customers: {
      title: 'Vatengi',
      subtitle: 'Tonga hukama hwako nevatengi',
      addCustomer: 'Wedzera Mutengi',
      customerName: 'Zita Remutengi',
      phone: 'Foni',
      email: 'Email',
      noCustomers: 'Hapana vatengi parizvino',
      address: 'Kero',
      totalSpent: 'Mari Yese Yakashandiswa',
      lastPurchase: 'Kutenga Kwekupedzisira',
    },
    suppliers: {
      title: 'Vatengesi',
      subtitle: 'Tonga hukama hwako nevanezvipo',
      addSupplier: 'Wedzera Mutengesi',
      supplierName: 'Zita Remutengesi',
      phone: 'Foni',
      email: 'Email',
      noSuppliers: 'Hapana vatengesi parizvino',
      address: 'Kero',
      totalSpent: 'Mari Yese Yakashandiswa',
      lastOrder: 'Order Yekupedzisira',
    },
    reports: {
      title: 'Mishumo',
      subtitle: 'Kuongorora kwebhizinesi uye ruzivo',
      profitLoss: 'Purofiti & Kurasikirwa',
      totalSales: 'Kutengesa Kwese',
      totalExpenses: 'Mari Yese Yabuda',
      netProfit: 'Purofiti Yemahara',
      margin: 'Margin',
      dailyTrends: 'Maitiro Ezuva Nezuva',
      salesByCategory: 'Kutengesa Nechikamu',
      expensesByCategory: 'Mari Yabuda Nechikamu',
      topSalesCategories: 'Zvikamu Zvepamusoro Zvekutengesa',
      topExpenseCategories: 'Zvikamu Zvepamusoro Zvemari Yabuda',
      balanceSheet: 'Balance Sheet',
      assets: 'Assets',
      liabilities: 'Liabilities',
      netWorth: 'Net Worth (Equity)',
      cashflowStatement: 'Cashflow Statement',
      operatingActivities: 'Operating Activities',
      investingActivities: 'Investing Activities',
      netChangeInCash: 'Net Change in Cash',
      invoiceStatus: 'Invoice Status',
      totalInvoiced: 'Total Invoiced',
      paid: 'Kubhadharwa',
      outstanding: 'Outstanding',
      exportReports: 'Buritsa Mishumo',
      summaryReport: 'Mushumo Wepfupiso',
      detailedReport: 'Mushumo Wakadzama',
    },
    budgets: {
      title: 'Budget',
      subtitle: 'Ronga uye tevera kushandisa kwako',
      addBudget: 'Wedzera Budget',
      budgetName: 'Zita ReBudget',
      period: 'Nguva',
      totalBudget: 'Budget Yese',
      spent: 'Yakashandiswa',
      remaining: 'Yasara',
      status: 'Mamiriro',
      noBudgets: 'Hapana budget parizvino',
      overBudget: 'Pamusoro PeBudget',
      onTrack: 'Pachinangwa',
    },
    cashflow: {
      title: 'Cashflow Projections',
      subtitle: 'Tevera maitiro emari yako',
      addProjection: 'Wedzera Projection',
      month: 'Mwedzi',
      income: 'Income',
      expenses: 'Mari Yabuda',
      netCashflow: 'Net Cashflow',
      closingBalance: 'Closing Balance',
      noProjections: 'Hapana projections parizvino',
    },
    projects: {
      title: 'Mapurojekiti',
      addProject: 'Wedzera Project',
      projectName: 'Zita Reproject',
      clientName: 'Zita Remutengi',
      status: 'Mamiriro',
      startDate: 'Zuva Rekutanga',
      endDate: 'Zuva Rekuguma',
      budget: 'Budget',
      progress: 'Progress',
      notes: 'Notes',
      noProjects: 'Hapana mapurojekiti parizvino',
      planning: 'Planning',
      active: 'Active',
      onHold: 'On Hold',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    employees: {
      title: 'Vashandi',
      addEmployee: 'Wedzera Mushandi',
      employeeName: 'Zita Remushandi',
      phone: 'Foni',
      email: 'Email',
      role: 'Role',
      noEmployees: 'Hapana vashandi parizvino',
      active: 'Active',
      inactive: 'Inactive',
    },
    tax: {
      title: 'Tax Management',
      subtitle: 'Tonga mitengo yemutero',
      addRate: 'Wedzera Rate',
      rateName: 'Zita Rerate',
      rate: 'Rate',
      defaultRate: 'Default',
      noRates: 'Hapana tax rates parizvino',
      manageTaxRates: 'Tonga tax rates',
    },
    accounts: {
      title: 'Accounts',
      subtitle: 'Tevera mari yakakweretwa nekwako',
      receivable: 'Receivable',
      payable: 'Payable',
      accountsReceivable: 'Accounts Receivable',
      accountsPayable: 'Accounts Payable',
      noReceivables: 'Hapana receivables parizvino',
      noPayables: 'Hapana payables parizvino',
    },
    pos: {
      title: 'Point of Sale',
      openShift: 'Vhura Shift',
      closeShift: 'Vhara Shift',
      shiftOpen: 'Shift Yakavhurwa',
      shiftStarted: 'Yakatanga',
      addToCart: 'Wedzera kuCart',
      removeFromCart: 'Bvisa muCart',
      checkout: 'Checkout',
      paymentMethod: 'Nzira Yekubhadhara',
      cash: 'Cash',
      card: 'Card',
      mobileMoney: 'Mobile Money',
      bankTransfer: 'Bank Transfer',
      total: 'Zvose',
      change: 'Change',
      receipt: 'Receipt',
    },
    appointments: {
      title: 'Appointments',
      addAppointment: 'Wedzera Appointment',
      clientName: 'Zita Remutengi',
      service: 'Service',
      date: 'Zuva',
      time: 'Nguva',
      status: 'Mamiriro',
      noAppointments: 'Hapana appointments parizvino',
      upcoming: 'zvinotevera',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    calculator: {
      title: 'Business Viability Check',
      subtitle: 'Verenga kana bhizinesi rako richibudirira',
      calculate: 'Verenga',
      monthlyRevenue: 'Monthly Revenue',
      monthlyExpenses: 'Monthly Expenses',
      profitability: 'Profitability',
      viable: 'Viable',
      notViable: 'Hazvina Viable',
      breakEven: 'Break Even',
    },
    businesses: {
      title: 'Mabhizinesi Angu',
      subtitle: 'Tonga mabhizinesi akawanda kubva kuaccount imwe',
      addBusiness: 'Wedzera Business',
      businessType: 'Rudzi Rwebhizinesi',
      businessStage: 'Nhanho Yebhizinesi',
      location: 'Nzvimbo',
      noBusinesses: 'Hapana mabhizinesi parizvino',
      switchBusiness: 'Shandura Business',
      deleteBusiness: 'Delete Business',
      cannotDelete: 'Haugone Delete',
      cannotDeleteActive: 'Haugone delete bhizinesi riri kushandiswa parizvino. Ndapota shandura kune rimwe bhizinesi kutanga.',
      businessDeleted: 'Business yadzimwa zvakanaka',
      retail: 'Retail Shop',
      services: 'Services',
      restaurant: 'Restaurant/Food',
      salon: 'Salon/Beauty',
      agriculture: 'Agriculture',
      construction: 'Construction',
      transport: 'Transport',
      manufacturing: 'Manufacturing',
      other: 'Other',
      running: 'Running',
      growing: 'Growing',
      planning: 'Planning',
    },
    admin: {
      adminConsole: 'Admin Console',
      platformStatistics: 'Platform Statistics',
      totalUsers: 'Vashandisi Vese',
      activeUsers: 'Vashandisi Vanoshanda',
      totalProducts: 'Zvigadzirwa Zvese',
      totalAds: 'Mashambadziro Ese',
      totalBusinesses: 'Mabhizinesi Ese',
      totalRevenue: 'Mari Yese Yakawana',
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
      filter: 'Hluza',
      export: 'Khipha',
      import: 'Faka',
      download: 'Thoba',
      upload: 'Layisha',
      select: 'Khetha',
      all: 'Konke',
      none: 'Lutho',
      today: 'Namuhla',
      week: 'Iviki',
      month: 'Inyanga',
      year: 'Unyaka',
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
      subtitle: 'Landela ukuthengisa, izindleko, nenenzuzo',
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
      filter: 'Hluza',
      export: 'Khipha',
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
      draft: 'Draft',
      sent: 'Ithunyelwe',
      paid: 'Ikhokhisiwe',
      cancelled: 'Ikhanseliwe',
      overdue: 'Isikhathi Sidlule',
    },
    products: {
      title: 'Imikhiqizo',
      addProduct: 'Engeza Umkhiqizo',
      productName: 'Igama Lomkhiqizo',
      price: 'Intengo',
      quantity: 'Ubuningi',
      category: 'Isigaba',
      noProducts: 'Azikho imikhiqizo okwamanje',
      costPrice: 'Intengo Yokuthenga',
      sellingPrice: 'Intengo Yokuthengisa',
      stock: 'Isitoko',
      lowStock: 'Isitoko Esiphansi',
      outOfStock: 'Awukho Isitoko',
    },
    customers: {
      title: 'Amakhasimende',
      subtitle: 'Phatha ubudlelwane bakho namakhasimende',
      addCustomer: 'Engeza Ikhasimende',
      customerName: 'Igama Lekhasimende',
      phone: 'Ifoni',
      email: 'I-Email',
      noCustomers: 'Azikho amakhasimende okwamanje',
      address: 'Ikheli',
      totalSpent: 'Isamba Esichithiwe',
      lastPurchase: 'Ukuthenga Kokugcina',
    },
    suppliers: {
      title: 'Abahlinzeki',
      subtitle: 'Phatha ubudlelwane bakho nabahlinzeki',
      addSupplier: 'Engeza Umhlinzeki',
      supplierName: 'Igama Lomhlinzeki',
      phone: 'Ifoni',
      email: 'I-Email',
      noSuppliers: 'Azikho abahlinzeki okwamanje',
      address: 'Ikheli',
      totalSpent: 'Isamba Esichithiwe',
      lastOrder: 'I-Odolo Yokugcina',
    },
    reports: {
      title: 'Imibiko',
      subtitle: 'Ukuhlaziya kwebhizinisi nokuqonda',
      profitLoss: 'Inzuzo & Ukulahleka',
      totalSales: 'Ukuthengisa Okuphelele',
      totalExpenses: 'Izindleko Eziphelele',
      netProfit: 'Inzuzo Engenamsebenzi',
      margin: 'Umkhawulo',
      dailyTrends: 'Izitayela Zansuku Zonke',
      salesByCategory: 'Ukuthengisa Ngesigaba',
      expensesByCategory: 'Izindleko Ngesigaba',
      topSalesCategories: 'Izigaba Eziphezulu Zokuthengisa',
      topExpenseCategories: 'Izigaba Eziphezulu Zezindleko',
      balanceSheet: 'I-Balance Sheet',
      assets: 'Impahla',
      liabilities: 'Izibopho',
      netWorth: 'Ubunono Obungenamsebenzi (I-Equity)',
      cashflowStatement: 'Isitatimende Se-Cashflow',
      operatingActivities: 'Imisebenzi Yokusebenza',
      investingActivities: 'Imisebenzi Yokutshalwa Kwezimali',
      netChangeInCash: 'Ukushintsha Okungenamsebenzi Emalini',
      invoiceStatus: 'Isimo Se-Invoice',
      totalInvoiced: 'Isamba Esichazwe',
      paid: 'Ikhokhisiwe',
      outstanding: 'Okungalungisiwe',
      exportReports: 'Khipha Imibiko',
      summaryReport: 'Umbiko Ofingqiwe',
      detailedReport: 'Umbiko Onemininingwane',
    },
    budgets: {
      title: 'Izabelo',
      subtitle: 'Hlela bese ulandela ukusetshenziswa kwakho',
      addBudget: 'Engeza Isabelo',
      budgetName: 'Igama Lesabelo',
      period: 'Isikhathi',
      totalBudget: 'Isabelo Esiphelele',
      spent: 'Sichithiwe',
      remaining: 'Okusele',
      status: 'Isimo',
      noBudgets: 'Azikho izabelo okwamanje',
      overBudget: 'Ngaphezulu Kwesabelo',
      onTrack: 'Kumgwaqo',
    },
    cashflow: {
      title: 'Izibikezelo Ze-Cashflow',
      subtitle: 'Landela izitayela zomkhakha wemali yakho',
      addProjection: 'Engeza Isibikezelo',
      month: 'Inyanga',
      income: 'Ingeniso',
      expenses: 'Izindleko',
      netCashflow: 'I-Cashflow Engenamsebenzi',
      closingBalance: 'I-Balance Yokuvala',
      noProjections: 'Azikho izibikezelo okwamanje',
    },
    projects: {
      title: 'Amaphrojekthi',
      addProject: 'Engeza Iphrojekthi',
      projectName: 'Igama Lephrojekthi',
      clientName: 'Igama Lekhasimende',
      status: 'Isimo',
      startDate: 'Usuku Lokusa',
      endDate: 'Usuku Lokuphela',
      budget: 'Isabelo',
      progress: 'Intuthuko',
      notes: 'Amanothi',
      noProjects: 'Azikho amaphrojekthi okwamanje',
      planning: 'Planning',
      active: 'Active',
      onHold: 'On Hold',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    employees: {
      title: 'Abasebenzi',
      addEmployee: 'Engeza Umsebenzi',
      employeeName: 'Igama Lomsebenzi',
      phone: 'Ifoni',
      email: 'I-Email',
      role: 'Indima',
      noEmployees: 'Azikho abasebenzi okwamanje',
      active: 'Active',
      inactive: 'Inactive',
    },
    tax: {
      title: 'Ukulawulwa Kwentela',
      subtitle: 'Phatha amanani entela',
      addRate: 'Engeza Amanani',
      rateName: 'Igama Lamanani',
      rate: 'Amanani',
      defaultRate: 'Okokuzenzakalela',
      noRates: 'Azikho amanani entela okwamanje',
      manageTaxRates: 'Phatha amanani entela',
    },
    accounts: {
      title: 'Ama-Akhawunti',
      subtitle: 'Landela imali okwele okukhokhwa kuwe nayo',
      receivable: 'Okungamukelwayo',
      payable: 'Okukhokhwayo',
      accountsReceivable: 'Ama-Akhawunti Angamukelwayo',
      accountsPayable: 'Ama-Akhawunti Okhokhwayo',
      noReceivables: 'Azikho okungamukelwayo okwamanje',
      noPayables: 'Azikho okukhokhwayo okwamanje',
    },
    pos: {
      title: 'Indawo Yokuthengisa',
      openShift: 'Vula I-Shift',
      closeShift: 'Vala I-Shift',
      shiftOpen: 'I-Shift Ivuliwe',
      shiftStarted: 'Iqalile',
      addToCart: 'Engeza Enqoleni',
      removeFromCart: 'Susa Enqoleni',
      checkout: 'I-Checkout',
      paymentMethod: 'Indlela Yokukhokha',
      cash: 'Imali',
      card: 'Ikhadi',
      mobileMoney: 'I-Mobile Money',
      bankTransfer: 'Ukudluliswa Kwebhange',
      total: 'Isamba',
      change: 'Ushintsho',
      receipt: 'Irisidi',
    },
    appointments: {
      title: 'Izihlolwano',
      addAppointment: 'Engeza Isihlolwano',
      clientName: 'Igama Lekhasimende',
      service: 'Inkonzo',
      date: 'Usuku',
      time: 'Isikhathi',
      status: 'Isimo',
      noAppointments: 'Azikho izihlolwano okwamanje',
      upcoming: 'ezizayo',
      completed: 'Kuqediwe',
      cancelled: 'Ikhanseliwe',
    },
    recurringInvoices: {
      title: 'Ama-Invoice Aphindaphindayo',
      subtitle: 'Yenza ngokuzenzakalelayo umjikelezo wakho wokubhalisa',
      addRecurringInvoice: 'Engeza I-Invoice Ephindaphindayo',
      invoiceName: 'Igama Le-Invoice',
      customer: 'Ikhasimende',
      amount: 'Inani',
      frequency: 'Ubuningi',
      startDate: 'Usuku Lokuqala',
      endDate: 'Usuku Lokugcina',
      status: 'Isimo',
      noRecurringInvoices: 'Azikho ama-invoice aphindaphindayo okwamanje',
      active: 'Iyasebenza',
      paused: 'Ime',
      completed: 'Kuqediwe',
    },
    calculator: {
      title: 'Ukuhlolwa Kokusebenza Kwebhizinisi',
      subtitle: 'Bala uma imodeli yakho yebhizinisi inenzuzo',
      calculate: 'Bala',
      monthlyRevenue: 'Ingeniso Yenyanga',
      monthlyExpenses: 'Izindleko Zenyanga',
      profitability: 'Ukuba nenenzuzo',
      viable: 'Kuyasebenza',
      notViable: 'Akusebenzi',
      breakEven: 'Ukulingana',
    },
    businesses: {
      title: 'Amabhizinisi Ami',
      subtitle: 'Phatha amabhizinisi amaningi kusuka ku-akhawunti eyodwa',
      addBusiness: 'Engeza Ibhizinisi',
      businessType: 'Uhlobo Lwebhizinisi',
      businessStage: 'Isigaba Sebhizinisi',
      location: 'Indawo',
      noBusinesses: 'Azikho amabhizinisi okwamanje',
      switchBusiness: 'Shintsha Ibhizinisi',
      deleteBusiness: 'Susa Ibhizinisi',
      cannotDelete: 'Awukwazi Ukususa',
      cannotDeleteActive: 'Awukwazi ukususa ibhizinisi elisebenzayo njengamanje. Sicela shintsha kwenye ibhizinisi kuqala.',
      businessDeleted: 'Ibhizinisi lisuswe ngempumelelo',
      retail: 'Isitolo',
      services: 'Izikhonzo',
      restaurant: 'I-Restaurant/I-Food',
      salon: 'I-Salon/Ubuhle',
      agriculture: 'Ezolimo',
      construction: 'Ukwakhiwa',
      transport: 'Ezokuthutha',
      manufacturing: 'Ukukhiqiza',
      other: 'Okunye',
      running: 'Iyasebenza',
      growing: 'Ikhula',
      planning: 'Planning',
    },
    admin: {
      adminConsole: 'Admin Console',
      platformStatistics: 'Platform Statistics',
      totalUsers: 'Bonke Abasebenzisi',
      activeUsers: 'Abasebenzisi Abasebenzayo',
      totalProducts: 'Bonke Imikhiqizo',
      totalAds: 'Bonke Izikhangiso',
      totalBusinesses: 'Bonke Amabhizinisi',
      totalRevenue: 'Yonke Imali Etholwe',
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
