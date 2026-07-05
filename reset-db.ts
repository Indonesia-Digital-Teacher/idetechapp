import mysql from "mysql2/promise";

async function resetDb() {
  try {
    const connection = await mysql.createConnection({
      host: "127.0.0.1",
      port: 3307,
      user: "root",
      password: "idetech_root_secret"
    });

    console.log("Koneksi berhasil. Menghapus database idetech...");
    await connection.query("DROP DATABASE IF EXISTS idetech;");
    
    console.log("Membuat ulang database idetech...");
    await connection.query("CREATE DATABASE idetech;");
    
    console.log("Database idetech berhasil di-reset! Silakan jalankan 'bun run dev' sekarang.");
    process.exit(0);
  } catch (err) {
    console.error("Gagal me-reset database:", err);
    process.exit(1);
  }
}

resetDb();
