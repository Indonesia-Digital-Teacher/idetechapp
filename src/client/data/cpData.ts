export type Fase = "E" | "F";

export interface SubOption {
  label: string;
  value: string;
  cp: string;
}

export interface MapelOption {
  label: string;
  value: string;
  /** Label untuk sub-dropdown (mis. "Pilih Agama", "Pilih Jurusan") */
  subLabel?: string;
  subOptions?: SubOption[];
  /** CP tetap untuk mapel tanpa sub-pilihan */
  cp?: string;
  /** true jika mapel ini butuh pilihan jurusan (KKA) */
  requiresJurusan?: boolean;
}

export interface JurusanOption {
  label: string;
  value: string;
  /** Keterangan singkat bidang yang dipakai untuk kontekstualisasi KKA */
  bidang: string;
  /** Contoh objek/sistem bidang keahlian untuk contoh pembelajaran */
  contohObjek: string;
  /** Contoh tantangan/produk AI yang relevan */
  contohProduk: string;
}

export const JURUSAN_SMK: JurusanOption[] = [
  { label: "Teknik Komputer dan Jaringan (TKJ)", value: "tkj", bidang: "Teknik Komputer dan Jaringan", contohObjek: "logika troubleshooting jaringan dan konfigurasi perangkat", contohProduk: "aplikasi pemantauan status jaringan berbasis IoT" },
  { label: "Teknik Kendaraan Ringan (TKR)", value: "tkr", bidang: "Teknik Kendaraan Ringan", contohObjek: "logika kerusakan pada sistem mesin", contohProduk: "aplikasi pemantauan kondisi kendaraan berbasis IoT" },
  { label: "Teknik Elektronika", value: "teknik-elektronika", bidang: "Teknik Elektronika", contohObjek: "logika perakitan dan pengujian rangkaian elektronika", contohProduk: "sistem monitoring perangkat elektronik berbasis sensor" },
  { label: "Teknik Listrik", value: "teknik-listrik", bidang: "Teknik Listrik", contohObjek: "logika instalasi dan pemeliharaan kelistrikan", contohProduk: "aplikasi monitoring konsumsi daya listrik berbasis IoT" },
  { label: "Teknik Mesin", value: "teknik-mesin", bidang: "Teknik Mesin", contohObjek: "logika perawatan dan perbaikan mesin industri", contohProduk: "sistem prediksi kerusakan mesin berbasis data sensor" },
  { label: "Akuntansi dan Keuangan Lembaga", value: "akl", bidang: "Akuntansi dan Keuangan", contohObjek: "logika pencatatan dan pelaporan keuangan", contohProduk: "aplikasi otomatisasi pembuatan laporan keuangan berbasis AI" },
  { label: "Otomatisasi dan Tata Kelola Perkantoran", value: "otkp", bidang: "Tata Kelola Perkantoran", contohObjek: "logika pengelolaan dokumen dan agenda", contohProduk: "asisten digital untuk pengarsipan dan jadwal kantor" },
  { label: "Bisnis Daring dan Pemasaran", value: "bdp", bidang: "Bisnis Daring dan Pemasaran", contohObjek: "logika analisis perilaku pelanggan dan strategi promosi", contohProduk: "aplikasi rekomendasi produk berbasis AI" },
  { label: "Perhotelan", value: "perhotelan", bidang: "Perhotelan", contohObjek: "logika pelayanan dan pengelolaan reservasi", contohProduk: "chatbot layanan tamu dan sistem rekomendasi fasilitas hotel" },
  { label: "Tata Boga", value: "tata-boga", bidang: "Tata Boga", contohObjek: "logika standarisasi resep dan pengendalian bahan", contohProduk: "aplikasi prediksi kebutuhan bahan baku berbasis data" },
  { label: "Tata Busana", value: "tata-busana", bidang: "Tata Busana", contohObjek: "logika desain pola dan pemilihan material", contohProduk: "aplikasi rekomendasi desain busana berbasis AI" },
  { label: "Keperawatan / Asisten Keperawatan", value: "keperawatan", bidang: "Keperawatan", contohObjek: "logika pengkajian dan rencana asuhan pasien", contohProduk: "sistem klasifikasi awal gejala pasien berbasis AI" },
  { label: "Farmasi", value: "farmasi", bidang: "Farmasi", contohObjek: "logika pengelolaan obat dan informasi kesehatan", contohProduk: "aplikasi reminder dan edukasi penggunaan obat berbasis AI" },
  { label: "Multimedia", value: "multimedia", bidang: "Multimedia", contohObjek: "logika produksi konten digital dan visual", contohProduk: "aplikasi pembuatan aset kreatif berbasis AI generatif" },
  { label: "Desain Komunikasi Visual", value: "dkv", bidang: "Desain Komunikasi Visual", contohObjek: "logika komunikasi visual dan branding", contohProduk: "aplikasi pembuatan desain grafis berbasis AI generatif" },
  { label: "Animasi", value: "animasi", bidang: "Animasi", contohObjek: "logika produksi animasi dan storytelling", contohProduk: "aplikasi pembuatan animasi dan karakter berbasis AI" },
  { label: "Teknik Jaringan Akses", value: "tja", bidang: "Teknik Jaringan Akses", contohObjek: "logika instalasi dan pemeliharaan jaringan akses", contohProduk: "sistem monitoring kualitas jaringan berbasis sensor" },
  { label: "Teknik Instalasi Tenaga Listrik", value: "titl", bidang: "Teknik Instalasi Tenaga Listrik", contohObjek: "logika instalasi tenaga listrik dan keselamatan kerja", contohProduk: "aplikasi monitoring instalasi listrik berbasis IoT" },
  { label: "Teknik Otomasi Industri", value: "toi", bidang: "Teknik Otomasi Industri", contohObjek: "logika kontrol dan otomasi sistem industri", contohProduk: "sistem prediksi pemeliharaan mesin industri berbasis AI" },
  { label: "Rekayasa Perangkat Lunak (RPL)", value: "rpl", bidang: "Rekayasa Perangkat Lunak", contohObjek: "logika pengembangan aplikasi dan sistem informasi", contohProduk: "aplikasi pemantauan dan diagnosis perangkat lunak berbasis AI" },
];

/** Mengembalikan label jurusan berdasarkan value */
export function getJurusanLabel(value: string): string {
  return JURUSAN_SMK.find(j => j.value === value)?.label ?? value;
}

/** Mengembalikan CP KKA yang dikontekstualisasikan untuk jurusan dan fase tertentu */
export function getKkaCp(fase: Fase, jurusanValue: string): string {
  const jurusan = JURUSAN_SMK.find(j => j.value === jurusanValue);
  const bidang = jurusan?.bidang ?? jurusanValue;
  const contohObjek = jurusan?.contohObjek ?? "objek atau sistem yang sesuai dengan bidang keahlian";
  const contohProduk = jurusan?.contohProduk ?? "produk berbasis AI";

  if (fase === "E") {
    return `Capaian Pembelajaran Koding dan Kecerdasan Artifisial (KKA) Fase E untuk bidang keahlian ${bidang}:\n\n` +
      `Pada fase ini, murid difokuskan pada penguasaan dasar koding dan pemahaman awal AI yang relevan dengan objek-objek di bidang ${bidang}:\n` +
      `• Berpikir Komputasional: Menerapkan strategi berpikir sistematis untuk memecahkan masalah pada objek atau sistem yang sesuai dengan bidang ${bidang} (misalnya ${contohObjek}).\n` +
      `• Literasi Digital: Memproduksi dan menyebarluaskan konten digital dalam bentuk multimedia yang berkaitan dengan bidang ${bidang}.\n` +
      `• Algoritma Pemrograman: Membandingkan algoritma dan menerapkan pemrograman untuk menghasilkan aplikasi sederhana.\n` +
      `• Analisis Data: Memahami konsep dasar basis data dan mengolah data di dalamnya.\n` +
      `• Literasi, Etika, dan Pemanfaatan AI: Memahami prinsip kerja AI secara bertanggung jawab pada bidang ${bidang} dengan memperhatikan etika dan keamanan data; serta menerapkan prompt engineering pada AI generatif untuk mengevaluasi rencana proyek atau desain barang/jasa.`;
  }

  return `Capaian Pembelajaran Koding dan Kecerdasan Artifisial (KKA) Fase F untuk bidang keahlian ${bidang}:\n\n` +
    `Pada fase ini, kompetensi ditingkatkan untuk menyelesaikan permasalahan yang lebih kompleks di dunia kerja bidang ${bidang}:\n` +
    `• Berpikir Komputasional: Memecahkan masalah kompleks di dunia kerja bidang ${bidang} dan melakukan prediksi berdasarkan data.\n` +
    `• Literasi Digital: Menerapkan produksi konten digital tingkat lanjut untuk mendukung pengembangan aplikasi dan AI yang sesuai dengan kebutuhan industri ${bidang}.\n` +
    `• Algoritma Pemrograman: Memahami dan menerapkan Pemrograman Berorientasi Objek (OOP) pada alat koding tingkat lanjut yang berkaitan dengan pemanfaatan AI.\n` +
    `• Analisis Data: Memahami data encoding dan menerapkan basis data untuk menyelesaikan permasalahan nyata di masyarakat atau dunia kerja bidang ${bidang}.\n` +
    `• Literasi dan Etika AI: Memahami dampak AI terhadap ketenagakerjaan di bidang ${bidang} serta bertanggung jawab dalam penggunaan teknologi tersebut.\n` +
    `• Pemanfaatan AI: Mampu mengaktualisasikan atau menciptakan produk berbasis AI yang spesifik untuk memecahkan tantangan teknis di dunia kerja bidang ${bidang}.\n\n` +
    `Catatan Strategis: Pembelajaran KKA di bidang ${bidang} harus bersifat human-centered, di mana manusia tetap menjadi fokus utama dalam pemanfaatan AI. Contoh implementasinya bisa berupa ${contohProduk}.`;
}

const agamaSubOptions: SubOption[] = [
  {
    label: "Islam",
    value: "islam",
    cp: "Memahami ayat Al-Qur'an dan hadis tentang berlomba dalam kebaikan serta larungan pergaulan bebas; memahami cabang-cabang iman (syu'ab al-īmān); menghindari penyakit hati; memahami sumber hukum Islam (al-kulliyāt al-khamsah); serta sejarah masuknya Islam ke Indonesia."
  },
  {
    label: "Kristen",
    value: "kristen",
    cp: "Memahami kemampuan mengembangkan rasio dan hati nurani; pemeliharaan Allah dalam setiap situasi; peran keluarga sebagai pendidik pertama; serta prinsip kesetiaan, kasih, dan keadilan dalam kehidupan sosial."
  },
  {
    label: "Katolik",
    value: "katolik",
    cp: "Memahami diri sebagai pribadi unik dan citra Allah; bersikap kritis terhadap pengaruh media massa dan ideologi; memahami Yesus sebagai Juru Selamat; serta memahami peran Kitab Suci, tradisi, dan magisterium."
  },
  {
    label: "Hindu",
    value: "hindu",
    cp: "Memahami kitab Dharmasastra; hukum Karmaphala dan Punarbhawa; ajaran Catur Warna; serta nilai-nilai dalam Yadnya dan kisah Ramayana/Mahabharata."
  },
  {
    label: "Buddha",
    value: "buddha",
    cp: "Memahami penyiaran agama Buddha; perjuangan pelaku sejarah masa kini; meditasi ketenangan batin; serta nilai moderasi beragama dan Hukum Kebenaran Mutlak."
  },
  {
    label: "Khonghucu",
    value: "khonghucu",
    cp: "Memahami sejarah nabi dan raja suci; perkembangan kitab suci (Wǔjīng); jalan suci Tiān (Tiāndào) dan hukum suci (Tiānlǐ); serta hakikat manusia dan moderasi beragama."
  }
];

const seniSubOptions: SubOption[] = [
  {
    label: "Seni Budaya",
    value: "senbud",
    cp: "Mengeksplorasi unsur rupa, tari, musik, atau teater; menghubungkan seni dengan kearifan lokal dan bidang keilmuan lain; serta membuat karya seni berdasarkan pengamatan terhadap lingkungan dengan mempertimbangkan fungsi dan teknik tertentu."
  },
  {
    label: "Musik",
    value: "musik",
    cp: "Mengidentifikasi unsur musik (nada, irama, melodi, dll) dan menganalisis musik dari berbagai genre; menyajikan musik nusantara dan modern; serta menciptakan karya musik kreasi sendiri."
  },
  {
    label: "Rupa",
    value: "rupa",
    cp: "Mengeksplorasi unsur rupa dan prinsip desain; menghubungkan seni dengan bidang keilmuan lain; serta membuat karya seni rupa berdasarkan pengamatan terhadap lingkungan dengan mempertimbangkan fungsi dan teknik tertentu."
  },
  {
    label: "Tari",
    value: "tari",
    cp: "Menginterpretasi makna dan simbol tari tradisi/kreasi; merancang karya tari secara individu atau kelompok; serta mengaktualisasikan diri melalui pertunjukan tari."
  },
  {
    label: "Teater",
    value: "teater",
    cp: "Menginterpretasi dialog atau naskah realis/propaganda; mengeksplorasi tata artistik panggung atau digital; serta menghasilkan naskah pertunjukan berdasarkan peristiwa aktual dan isu sosial."
  }
];

const agamaSubOptionsF: SubOption[] = [
  {
    label: "Islam",
    value: "islam",
    cp: "Berfokus pada kemampuan berpikir kritis, pemanfaatan IPTEK, memelihara kehidupan, dan moderasi beragama. Murid mempelajari adab bermasyarakat, etika digital, serta hukum Islam terkait muamalah, munakahat, dan mawaris."
  },
  {
    label: "Kristen",
    value: "kristen",
    cp: "Memahami perkembangan IPTEK, demokrasi, dan HAM sebagai anugerah Allah; menggunakan talenta untuk bangsa; serta bersikap bijak dalam melestarikan sumber daya alam."
  },
  {
    label: "Katolik",
    value: "katolik",
    cp: "Memahami makna panggilan hidup (berkeluarga, membiara, profesi); memahami sifat dan karya pastoral gereja; serta berperan aktif dalam membangun bangsa berlandaskan budaya kasih dan keadilan."
  },
  {
    label: "Hindu",
    value: "hindu",
    cp: "Mendalami kodifikasi Weda, Upanisad, Darsana, dan Moksa; memahami konsep Keluarga Sukhinah dan Astangga Yoga; serta perkembangan Hindu di abad ke-21."
  },
  {
    label: "Buddha",
    value: "buddha",
    cp: "Memahami komunikasi lintas budaya secara bijaksana; melaksanakan upacara keagamaan dengan keyakinan; serta memahami fenomena global dan ekonomi melalui Hukum Kebenaran Mutlak."
  },
  {
    label: "Khonghucu",
    value: "khonghucu",
    cp: "Memahami fase perkembangan nabi dan raja suci; serta mengupayakan terwujudnya masyarakat damai yang agung (Dàtóng)."
  }
];

const seniSubOptionsF: SubOption[] = [
  {
    label: "Musik",
    value: "musik",
    cp: "Mengevaluasi karya musik secara musikal; menyajikan ansambel musik dengan teknologi yang sesuai; serta menciptakan karya kolaborasi dengan manajemen pementasan."
  },
  {
    label: "Rupa",
    value: "rupa",
    cp: "Mengeksplorasi unsur rupa dan prinsip desain; menganalisis potensi bahan lokal dan keterhubungan seni dengan bidang keilmuan lain; serta menciptakan karya rupa untuk merespons isu kemanusiaan/lingkungan."
  },
  {
    label: "Tari",
    value: "tari",
    cp: "Mengevaluasi hasil penciptaan karya tari secara estetika dan kinestetik; serta mengaktualisasikan diri melalui pertunjukan tari yang bermakna bagi masyarakat."
  },
  {
    label: "Teater",
    value: "teater",
    cp: "Menerapkan teknik keaktoran untuk menunjukkan kepekaan terhadap persoalan sosial; merancang tata artistik; serta menghasilkan pertunjukan yang memberikan dampak positif bagi lingkungan."
  }
];

export const CP_DATA: Record<Fase, MapelOption[]> = {
  E: [
    {
      label: "Pendidikan Agama Islam dan Budi Pekerti",
      value: "pai",
      subLabel: "Pilih Agama",
      subOptions: agamaSubOptions
    },
    {
      label: "Pendidikan Pancasila",
      value: "ppkn",
      cp: "Menganalisis cara pandang perumus Pancasila; kedudukan Pancasila sebagai dasar negara dan ideologi; tata urutan peraturan perundang-undangan di Indonesia; makna semboyan Bhinneka Tunggal Ika sebagai modal sosial; serta peran warga negara dalam sistem pertahanan dan keamanan nasional."
    },
    {
      label: "Bahasa Indonesia",
      value: "bindo",
      cp: "Mengevaluasi gagasan dan pesan dari teks nonsastra dan sastra; menginterpretasi gagasan serta perasaan simpati/empati dari teks visual atau audio visual; mengevaluasi kredibilitas sumber informasi; mempresentasikan gagasan secara sistematis dan kritis; serta menulis gagasan secara logis dan kreatif untuk dipublikasikan di berbagai media."
    },
    {
      label: "Matematika",
      value: "mtk",
      cp: "Menggeneralisasi sifat-sifat bilangan berpangkat (termasuk pangkat pecahan); menyelesaikan masalah sistem pertidaksamaan linear dua variabel, persamaan/fungsi kuadrat (termasuk akar imajiner), dan fungsi eksponensial; menerapkan perbandingan trigonometri; serta merepresentasikan data statistik (box plot, histogram, scatter plot) dan mengevaluasi laporan statistik di media."
    },
    {
      label: "Bahasa Inggris",
      value: "bing",
      cp: "Memahami alur informasi dan gagasan utama dalam teks lisan fiksi dan nonfiksi; menggunakan bahasa Inggris untuk berpendapat dan berargumen; menganalisis informasi tersurat dan tersirat dari berbagai teks multimodal; serta mengomunikasikan gagasan secara tertulis atau digital dengan struktur teks yang tepat."
    },
    {
      label: "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      value: "pjok",
      cp: "Menerapkan keterampilan gerak spesifik dan strategi dalam berbagai situasi menantang; memperagakan perilaku etis dan fair play; menerapkan pengambilan keputusan dan kolaborasi dalam tim; serta mengevaluasi risiko gaya hidup dan mempromosikan tindakan pencegahan penyakit."
    },
    {
      label: "Sejarah (Khusus SMK)",
      value: "sejarah",
      cp: "Memahami konsep dasar ilmu sejarah; menginterpretasi peristiwa sejarah Indonesia dari masa Kerajaan hingga Pergerakan Kebangsaan; serta mengaplikasikan keterampilan berpikir sejarah untuk mengkritisi peristiwa masa lalu yang relevan dengan bidang kejuruan murid melalui proses inkuiri."
    },
    {
      label: "Informatika",
      value: "informatika",
      cp: "Memahami konsep struktur data dan algoritma standar; menerapkan proses komputasi untuk mendapatkan data berkualitas; menuliskan solusi rancangan program dalam pseudocode; memahami model komputer Von Neumann; mengevaluasi fakta digital (lateral reading); serta memanfaatkan teknologi digital untuk kolaborasi dan konfigurasi keamanan akun."
    },
    {
      label: "Projek Ilmu Pengetahuan Alam dan Sosial (IPAS - Khusus SMK)",
      value: "ipas",
      cp: "Menjelaskan fenomena secara ilmiah dari berbagai aspek (makhluk hidup, zat, energi, keruangan, ekonomi); menyusun penyelidikan ilmiah; serta merefleksikan data dan bukti ilmiah untuk membangun argumen yang dikaitkan dengan aspek teknis pada bidang keahliannya."
    },
    {
      label: "Seni (Pilihan)",
      value: "seni",
      subLabel: "Pilih Jenis Seni",
      subOptions: seniSubOptions
    },
    {
      label: "Koding dan Kecerdasan Artifisial (KKA)",
      value: "kka",
      subLabel: "Pilih Jurusan SMK",
      requiresJurusan: true
    },
    {
      label: "Dasar-dasar Program Keahlian TKJ",
      value: "ddpk-tkj",
      cp: "Memahami wawasan industri TJKT, perkembangan teknologi jaringan dan telekomunikasi, K3LH dan budaya kerja, sistem operasi serta perangkat keras, virtualisasi dan layanan server dasar, media transmisi, alamat IP, fiber optic, router/switch, dan penggunaan alat ukur jaringan."
    },
    {
      label: "Muatan Lokal (Bahasa Jawa)",
      value: "mulok",
      cp: "Mengevaluasi gagasan dan pesan dari teks sastra lokal; menggunakan unggah-ungguh basa secara tepat; menulis gagasan menggunakan aksara daerah; memahami nilai filosofis tembang dan kearifan budaya lokal; serta mempresentasikan gagasan dan hasil penyelidikan budaya secara kritis."
    }
  ],
  F: [
    {
      label: "Pendidikan Agama Islam dan Budi Pekerti",
      value: "pai",
      subLabel: "Pilih Agama",
      subOptions: agamaSubOptionsF
    },
    {
      label: "Pendidikan Pancasila",
      value: "ppkn",
      cp: "Menganalisis peluang dan tantangan penerapan nilai Pancasila dalam kehidupan global; menganalisis dinamika UUD NRI Tahun 1945 dan kasus pelanggaran hak/kewajiban; serta mendemonstrasikan praktik demokrasi dan merumuskan solusi atas ancaman terhadap NKRI."
    },
    {
      label: "Bahasa Indonesia",
      value: "bindo",
      cp: "Mengevaluasi berbagai teks (nonsastra dan sastra Indonesia/dunia) dalam konteks sosial, akademis, dan dunia kerja; mempresentasikan gagasan melalui berbagai media; serta memodifikasi karya sastra ke dalam bentuk multimedia dan memublikasikannya secara digital."
    },
    {
      label: "Matematika (Umum)",
      value: "mtk",
      cp: "Menerapkan konsep barisan dan deret pada masalah bunga majemuk dan anuitas; menentukan fungsi invers dan komposisi; memahami hubungan unsur-unsur lingkaran; serta melakukan penyelidikan statistika (regresi linear) dan menghitung peluang kejadian majemuk."
    },
    {
      label: "Bahasa Inggris",
      value: "bing",
      cp: "Memahami alur informasi teks lisan fiksi dan nonfiksi tentang isu terkini; mengevaluasi informasi tersurat dan tersirat dari berbagai teks multimodal; serta mengomunikasikan gagasan secara tertulis dengan struktur teks yang kompleks dan strategi koreksi mandiri."
    },
    {
      label: "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      value: "pjok",
      cp: "Mengevaluasi keterampilan gerak spesifik dan strategi dalam situasi menantang; mengevaluasi penerapan fair play dan perilaku etis; serta mengadvokasi gaya hidup sehat dan pola makan seimbang melalui berbagai media."
    },
    {
      label: "Sejarah (Khusus SMK)",
      value: "sejarah",
      cp: "Memahami peristiwa sejarah dari masa pendudukan Jepang hingga Era Reformasi menggunakan konsep dasar ilmu sejarah; serta mampu mengaitkan nilai-nilai sejarah yang relevan dengan kompetensi kejuruan untuk menghadapi tantangan dunia kerja."
    },
    {
      label: "Informatika",
      value: "informatika",
      cp: "Menganalisis strategi algoritmik untuk solusi yang efisien; merancang struktur data kompleks; melakukan pengiriman data dan troubleshooting jaringan; mengevaluasi kebenaran konten digital; serta mengembangkan program komputer terstruktur menggunakan library yang tersedia."
    },
    {
      label: "Seni (Pilihan)",
      value: "seni",
      subLabel: "Pilih Jenis Seni",
      subOptions: seniSubOptionsF
    },
    {
      label: "Koding dan Kecerdasan Artifisial (KKA)",
      value: "kka",
      subLabel: "Pilih Jurusan SMK",
      requiresJurusan: true
    }
  ]
};
