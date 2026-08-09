import type { Lang } from '@/types'

export const translations = {
  en: {
    // brand
    brandName: 'Cotton Candy',
    tagline: 'Your lectures, written for you — live.',
    heroKicker: 'Stop typing. Start listening.',

    // nav
    navFeatures: 'Features',
    navPricing: 'Pricing',
    navLogin: 'Log in',
    navStart: 'Start free',

    // landing
    heroSub: 'Cotton Candy listens to your class through your phone mic and writes a clean markdown note in real time — then turns it into a timelined PDF notebook when the lecture ends.',
    heroCta: 'Record my first lecture',
    heroNote: 'No download. Works in your browser. Free for 3 lectures.',

    // how it works
    howTitle: 'How it works',
    howStep1Title: 'Press Record',
    howStep1: 'Open Cotton Candy in your browser, hit the big pink button, and put the phone on your desk.',
    howStep2Title: 'Listen along',
    howStep2: 'Every spoken word becomes a markdown line in real time. You can still highlight, star, or tag on the fly.',
    howStep3Title: 'Get your notebook',
    howStep3: 'When class ends, we auto-build a timeline, pull out keywords, and export a printable PDF notebook.',

    // features
    featuresTitle: 'Everything a good student wishes they had',
    feat1: 'Live markdown — each sentence becomes a bullet the moment it is spoken',
    feat2: 'Auto timeline — topic changes, formulas, examples are stamped with timecodes',
    feat3: 'Smart keywords — the 10 words you should revise before the exam',
    feat4: 'PDF export — A4, tidy, ready to print or upload to your notebook folder',
    feat5: 'Notebook grouping — group by subject, export the whole semester as one PDF',
    feat6: 'Works offline — keep writing notes even if the wifi dies halfway',

    // pricing
    pricingTitle: 'Simple pricing',
    pricingSub: 'Student-friendly. No card for free plan.',
    planFree: 'Free',
    planDay: 'Day Pass',
    planMonth: 'Monthly',
    planYear: 'Yearly',
    perMonth: '/mo',
    perYear: '/yr',
    perDay: '/day',
    choosePlan: 'Choose plan',
    currentPlan: 'Current plan',

    // pricing features
    pf_lectures: '{n} lectures',
    pf_minutes: '{n} min per lecture',
    pf_notebooks: '{n} notebooks',
    pf_pdf: 'PDF export',
    pf_md: 'Markdown export',
    pf_ai: 'AI summary & keywords',
    pf_nowater: 'No watermark',
    pf_water: 'Small watermark on PDF',

    // auth
    loginTitle: 'Welcome back',
    loginSub: "We'll email you a magic link. No password ever.",
    loginPlaceholder: 'you@school.edu',
    loginSend: 'Send magic link',
    loginSending: 'Sending…',
    loginSent: 'Check your email — link sent!',
    loginErr: 'Something went wrong. Try again?',

    // dashboard
    dashHome: 'Home',
    dashLectures: 'Lectures',
    dashNotebooks: 'Notebooks',
    dashStudyTimer: 'Study Timer',
    dashPromoCode: 'Promo Code',
    dashSettings: 'Settings',
    dashSignOut: 'Sign out',

    // home
    homeHi: 'Hi',
    homeToday: "Today's class?",
    homeNewLecture: 'Start new lecture',
    homeRecent: 'Recent lectures',
    homeNoLectures: 'No lectures yet. Your first one is one tap away.',
    homeStats: 'This week',
    homeMinutes: 'minutes recorded',
    homeLecturesCount: 'lectures',
    homeWords: 'words written',

    // lecture new
    newTitle: 'New lecture',
    newPlaceholder: 'e.g. Biology — Chapter 3: Mitosis',
    newSubject: 'Subject',
    newLecturer: 'Lecturer',
    newLocation: 'Room / Hall',
    newStart: 'Start recording',

    // recording page
    recStart: 'Press to start',
    recStop: 'Finish lecture',
    recPause: 'Pause',
    recResume: 'Resume',
    recListening: 'Listening…',
    recDuration: 'Duration',
    recWords: 'Words',
    recStar: 'Star this line',
    recTopic: 'Mark topic change',
    recFormula: 'This is a formula',
    recQuestion: 'Mark as question',
    recDownload: 'Download',
    recDownloadMd: 'Download .md',
    recDownloadPdf: 'Download .pdf',
    recNotSupported: 'Your browser does not support live speech recognition. Please use Chrome or Edge on desktop, or Chrome on Android.',
    recPermission: 'Please allow microphone access.',

    // lectures list
    lecturesTitle: 'All lectures',
    lecturesNew: 'New lecture',
    lecturesEmpty: 'Nothing yet — record your first class to fill this space.',
    lecturesOpen: 'Open',
    lecturesExport: 'Export PDF',

    // notebooks
    nbTitle: 'Notebooks',
    nbNew: 'New notebook',
    nbName: 'Notebook name',
    nbSubject: 'Subject',
    nbCreate: 'Create',
    nbAddLecture: 'Add lecture',
    nbExport: 'Export full notebook as PDF',
    nbEmpty: 'Group your lectures by subject — then export the whole semester in one PDF.',

    // settings
    setTitle: 'Settings',
    setLang: 'Language',
    setTheme: 'Theme',
    setThemeSub: 'Pick your vibe — pink, blue, green or yellow.',
    setPlan: 'Your plan',
    setUpgrade: 'Upgrade',
    setDanger: 'Danger zone',
    setSignOut: 'Sign out of Cotton Candy',
    themePickTitle: 'Pick your vibe',
    themePickSub: 'Change anytime in Settings.',

    // limit warnings
    limitReached: 'Limit reached on your plan',
    upgradeToContinue: 'Upgrade to continue recording',

    // common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    loading: 'Loading…',
    back: 'Back',
    footerSlogan: 'Built for students who want to listen, not type.',
  },

  bm: {
    brandName: 'Cotton Candy',
    tagline: 'Kuliah anda, ditulis untuk anda — secara langsung.',
    heroKicker: 'Berhenti menaip. Mula mendengar.',

    navFeatures: 'Ciri',
    navPricing: 'Harga',
    navLogin: 'Log masuk',
    navStart: 'Mula percuma',

    heroSub: 'Cotton Candy dengar kelas anda melalui mikrofon telefon dan tulis nota markdown yang kemas secara masa-nyata — kemudian jadikan ia notebook PDF bertimeline bila kuliah tamat.',
    heroCta: 'Rakam kuliah pertama saya',
    heroNote: 'Tiada muat turun. Dalam pelayar web sahaja. Percuma untuk 3 kuliah.',

    howTitle: 'Cara ia berfungsi',
    howStep1Title: 'Tekan Rakam',
    howStep1: 'Buka Cotton Candy dalam pelayar, tekan butang merah jambu besar, dan letak telefon di atas meja.',
    howStep2Title: 'Dengar bersama',
    howStep2: 'Setiap perkataan yang dituturkan menjadi baris markdown secara langsung. Anda masih boleh bintang, tanda atau tag.',
    howStep3Title: 'Dapatkan notebook anda',
    howStep3: 'Bila kelas tamat, kami auto-bina timeline, keluarkan kata kunci, dan eksport PDF notebook yang boleh cetak.',

    featuresTitle: 'Semua yang pelajar baik harap mereka ada',
    feat1: 'Markdown langsung — setiap ayat jadi bullet sebaik dituturkan',
    feat2: 'Timeline auto — perubahan topik, rumus, contoh distempel dengan kod masa',
    feat3: 'Kata kunci pintar — 10 perkataan untuk ulangkaji sebelum exam',
    feat4: 'Eksport PDF — A4, kemas, sedia untuk cetak atau muat naik',
    feat5: 'Kumpulan notebook — kumpul ikut subjek, eksport satu semester dalam satu PDF',
    feat6: 'Berfungsi offline — terus menulis nota walaupun wifi mati separuh jalan',

    pricingTitle: 'Harga mudah',
    pricingSub: 'Mesra pelajar. Tiada kad diperlukan untuk pelan percuma.',
    planFree: 'Percuma',
    planDay: 'Pass Harian',
    planMonth: 'Bulanan',
    planYear: 'Tahunan',
    perMonth: '/bln',
    perYear: '/thn',
    perDay: '/hari',
    choosePlan: 'Pilih pelan',
    currentPlan: 'Pelan semasa',

    pf_lectures: '{n} kuliah',
    pf_minutes: '{n} min setiap kuliah',
    pf_notebooks: '{n} notebook',
    pf_pdf: 'Eksport PDF',
    pf_md: 'Eksport Markdown',
    pf_ai: 'Ringkasan & kata kunci AI',
    pf_nowater: 'Tiada tanda air',
    pf_water: 'Tanda air kecil pada PDF',

    loginTitle: 'Selamat kembali',
    loginSub: 'Kami akan emel pautan ajaib. Tiada kata laluan.',
    loginPlaceholder: 'anda@sekolah.edu',
    loginSend: 'Hantar pautan ajaib',
    loginSending: 'Menghantar…',
    loginSent: 'Semak emel anda — pautan telah dihantar!',
    loginErr: 'Ada masalah. Cuba lagi?',

    dashHome: 'Utama',
    dashLectures: 'Kuliah',
    dashNotebooks: 'Notebook',
    dashStudyTimer: 'Pemasa Belajar',
    dashPromoCode: 'Kod Promo',
    dashSettings: 'Tetapan',
    dashSignOut: 'Log keluar',

    homeHi: 'Hai',
    homeToday: 'Kelas hari ini?',
    homeNewLecture: 'Mula kuliah baru',
    homeRecent: 'Kuliah terkini',
    homeNoLectures: 'Belum ada kuliah. Pertama anda hanya sekali tap.',
    homeStats: 'Minggu ini',
    homeMinutes: 'minit dirakam',
    homeLecturesCount: 'kuliah',
    homeWords: 'perkataan ditulis',

    newTitle: 'Kuliah baru',
    newPlaceholder: 'cth. Biologi — Bab 3: Mitosis',
    newSubject: 'Subjek',
    newLecturer: 'Pensyarah',
    newLocation: 'Bilik / Dewan',
    newStart: 'Mula rakam',

    recStart: 'Tekan untuk mula',
    recStop: 'Tamatkan kuliah',
    recPause: 'Jeda',
    recResume: 'Sambung',
    recListening: 'Mendengar…',
    recDuration: 'Tempoh',
    recWords: 'Perkataan',
    recStar: 'Bintang baris ini',
    recTopic: 'Tanda perubahan topik',
    recFormula: 'Ini adalah rumus',
    recQuestion: 'Tandakan sebagai soalan',
    recDownload: 'Muat turun',
    recDownloadMd: 'Muat turun .md',
    recDownloadPdf: 'Muat turun .pdf',
    recNotSupported: 'Pelayar anda tidak menyokong pengecaman pertuturan langsung. Sila guna Chrome atau Edge di desktop, atau Chrome di Android.',
    recPermission: 'Sila benarkan akses mikrofon.',

    lecturesTitle: 'Semua kuliah',
    lecturesNew: 'Kuliah baru',
    lecturesEmpty: 'Belum ada apa-apa — rakam kelas pertama untuk isi ruang ini.',
    lecturesOpen: 'Buka',
    lecturesExport: 'Eksport PDF',

    nbTitle: 'Notebook',
    nbNew: 'Notebook baru',
    nbName: 'Nama notebook',
    nbSubject: 'Subjek',
    nbCreate: 'Cipta',
    nbAddLecture: 'Tambah kuliah',
    nbExport: 'Eksport notebook penuh sebagai PDF',
    nbEmpty: 'Kumpul kuliah ikut subjek — kemudian eksport satu semester dalam satu PDF.',

    setTitle: 'Tetapan',
    setLang: 'Bahasa',
    setTheme: 'Tema',
    setThemeSub: 'Pilih vibe anda — pink, biru, hijau atau kuning.',
    setPlan: 'Pelan anda',
    setUpgrade: 'Naik taraf',
    setDanger: 'Zon bahaya',
    setSignOut: 'Log keluar Cotton Candy',
    themePickTitle: 'Pilih tema anda',
    themePickSub: 'Boleh tukar bila-bila masa dalam Tetapan.',

    limitReached: 'Had pelan anda telah dicapai',
    upgradeToContinue: 'Naik taraf untuk terus merakam',

    save: 'Simpan',
    cancel: 'Batal',
    delete: 'Padam',
    confirm: 'Sahkan',
    loading: 'Memuatkan…',
    back: 'Kembali',
    footerSlogan: 'Dibina untuk pelajar yang nak dengar, bukan menaip.',
  },
} as const

export type TKey = keyof typeof translations.en

export function t(lang: Lang, key: TKey, vars?: Record<string, string | number>) {
  let str: string = (translations[lang] as any)[key] ?? (translations.en as any)[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return str
}
