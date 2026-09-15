const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "ctf.db");
const db = new sqlite3.Database(dbPath);

// Helper promise wrappers
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize schema and seed data
async function initDatabase() {
  await run(`PRAGMA foreign_keys = ON;`);

  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'participant',
      score INTEGER NOT NULL DEFAULT 0,
      avatar TEXT DEFAULT '',
      is_banned INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'code'
    )
  `);

  // Challenges table (with Beginner difficulty added)
  await run(`DROP TABLE IF EXISTS challenges;`);
  await run(`
    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('Beginner', 'Easy', 'Medium', 'Hard', 'Insane')),
      points INTEGER NOT NULL DEFAULT 100,
      description TEXT NOT NULL,
      hints TEXT DEFAULT '[]',
      flag TEXT NOT NULL,
      author TEXT DEFAULT 'XCTF Team',
      url TEXT DEFAULT '',
      files TEXT DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Submissions log table
  await run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      submitted_flag TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      points_awarded INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Solves table (unique per user & challenge)
  await run(`
    CREATE TABLE IF NOT EXISTS solves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      points_awarded INTEGER NOT NULL,
      is_first_blood INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, challenge_id)
    )
  `);

  // Achievements table
  await run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT DEFAULT 'award',
      points INTEGER NOT NULL DEFAULT 50
    )
  `);

  // User achievements
  await run(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_id)
    )
  `);

  // Competition settings
  await run(`
    CREATE TABLE IF NOT EXISTS competition_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Mini CTFs table
  await run(`
    CREATE TABLE IF NOT EXISTS mini_ctfs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'Easy' CHECK(difficulty IN ('Beginner', 'Easy', 'Medium', 'Hard', 'Insane', 'Mixed')),
      category TEXT NOT NULL DEFAULT 'Mixed',
      status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Published', 'Active', 'Completed', 'Archived')),
      visibility TEXT NOT NULL DEFAULT 'Public' CHECK(visibility IN ('Public', 'Private', 'Hidden', 'Scheduled')),
      time_mode TEXT NOT NULL DEFAULT 'normal' CHECK(time_mode IN ('normal', 'time_limited')),
      time_limit_minutes INTEGER DEFAULT 30,
      scheduled_start_time DATETIME DEFAULT NULL,
      scheduled_end_time DATETIME DEFAULT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Mini CTF Challenges (Ordered sequence)
  await run(`
    CREATE TABLE IF NOT EXISTS mini_ctf_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mini_ctf_id INTEGER NOT NULL REFERENCES mini_ctfs(id) ON DELETE CASCADE,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      sequence_order INTEGER NOT NULL DEFAULT 1,
      UNIQUE(mini_ctf_id, challenge_id)
    )
  `);

  // Mini CTF Permissions (For Private visibility)
  await run(`
    CREATE TABLE IF NOT EXISTS mini_ctf_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mini_ctf_id INTEGER NOT NULL REFERENCES mini_ctfs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(mini_ctf_id, user_id)
    )
  `);

  // Mini CTF Attempts (Timer & progress tracking)
  await run(`
    CREATE TABLE IF NOT EXISTS mini_ctf_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mini_ctf_id INTEGER NOT NULL REFERENCES mini_ctfs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attempt_number INTEGER DEFAULT 1,
      is_active_attempt INTEGER DEFAULT 1,
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_time DATETIME DEFAULT NULL,
      total_time_seconds INTEGER DEFAULT NULL,
      challenges_completed INTEGER DEFAULT 0,
      total_challenges INTEGER DEFAULT 0,
      status TEXT DEFAULT 'In_Progress'
    )
  `);

  // Mini CTF Per-Challenge Progress (Duration & Skip tracking)
  await run(`
    CREATE TABLE IF NOT EXISTS mini_ctf_challenge_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL REFERENCES mini_ctf_attempts(id) ON DELETE CASCADE,
      mini_ctf_id INTEGER NOT NULL REFERENCES mini_ctfs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'In_Progress',
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME DEFAULT NULL,
      duration_seconds INTEGER DEFAULT NULL,
      UNIQUE(attempt_id, challenge_id)
    )
  `);

  // Mini CTF Status Audit Logs
  await run(`
    CREATE TABLE IF NOT EXISTS mini_ctf_status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mini_ctf_id INTEGER NOT NULL REFERENCES mini_ctfs(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reason TEXT DEFAULT ''
    )
  `);

  // Admin Reset Operations Audit Logs
  await run(`
    CREATE TABLE IF NOT EXISTS admin_reset_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reset_type TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('Challenge', 'MiniCTF', 'ParticipantProgress')),
      target_id INTEGER NOT NULL,
      affected_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reason TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Auto-migration columns for mini_ctfs table
  try {
    await run(`ALTER TABLE mini_ctfs ADD COLUMN time_mode TEXT DEFAULT 'normal'`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE mini_ctfs ADD COLUMN time_limit_minutes INTEGER DEFAULT 30`);
  } catch (e) {}

  // Auto-migration columns & constraint update for mini_ctf_attempts table
  try {
    await run(`ALTER TABLE mini_ctf_attempts ADD COLUMN attempt_number INTEGER DEFAULT 1`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE mini_ctf_attempts ADD COLUMN is_active_attempt INTEGER DEFAULT 1`);
  } catch (e) {}

  try {
    const tableInfo = await get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='mini_ctf_attempts'`);
    if (tableInfo && tableInfo.sql && tableInfo.sql.includes("UNIQUE(mini_ctf_id, user_id)")) {
      await run(`CREATE TABLE IF NOT EXISTS mini_ctf_attempts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mini_ctf_id INTEGER NOT NULL REFERENCES mini_ctfs(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attempt_number INTEGER DEFAULT 1,
        is_active_attempt INTEGER DEFAULT 1,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME DEFAULT NULL,
        total_time_seconds INTEGER DEFAULT NULL,
        challenges_completed INTEGER DEFAULT 0,
        total_challenges INTEGER DEFAULT 0,
        status TEXT DEFAULT 'In_Progress'
      )`);
      await run(`INSERT INTO mini_ctf_attempts_new (id, mini_ctf_id, user_id, attempt_number, is_active_attempt, start_time, end_time, total_time_seconds, challenges_completed, total_challenges, status) SELECT id, mini_ctf_id, user_id, COALESCE(attempt_number, 1), COALESCE(is_active_attempt, 1), start_time, end_time, total_time_seconds, challenges_completed, total_challenges, status FROM mini_ctf_attempts`);
      await run(`DROP TABLE mini_ctf_attempts`);
      await run(`ALTER TABLE mini_ctf_attempts_new RENAME TO mini_ctf_attempts`);
    }
  } catch (e) {
    console.error("Migration error for mini_ctf_attempts:", e.message);
  }

  await seedData();
}

async function seedData() {
  // 1. Config defaults
  const configItems = [
    { key: "title", value: "XCTF Cyber Warfare 2026" },
    { key: "status", value: "active" },
    { key: "start_time", value: new Date(Date.now() - 3600000 * 24).toISOString() },
    { key: "end_time", value: new Date(Date.now() + 3600000 * 48).toISOString() },
    { key: "freeze_time", value: new Date(Date.now() + 3600000 * 40).toISOString() },
    { key: "rules", value: "1. Respect other teams.\n2. Do not attack CTF infrastructure.\n3. Flag format is XCTF{...}.\n4. Sharing flags is strictly prohibited." }
  ];

  for (const item of configItems) {
    await run(
      `INSERT OR IGNORE INTO competition_config (key, value) VALUES (?, ?)`,
      [item.key, item.value]
    );
  }

  // 2. Categories
  const categoriesList = [
    { name: "Web Exploitation", slug: "web-exploitation", description: "Vulnerabilities in web applications", icon: "globe" },
    { name: "Cryptography", slug: "cryptography", description: "Ciphers, RSA, hash collisions and encryption breakdown", icon: "lock" },
    { name: "Digital Forensics", slug: "digital-forensics", description: "Packet captures, memory dumps, disk forensics", icon: "search" },
    { name: "OSINT", slug: "osint", description: "Open Source Intelligence gathering and recon", icon: "eye" },
    { name: "Reverse Engineering", slug: "reverse-engineering", description: "Decompiling binaries and analyzing obfuscated code", icon: "cpu" },
    { name: "Binary Exploitation", slug: "binary-exploitation", description: "Buffer overflows, ROP chains, shellcoding", icon: "terminal" },
    { name: "Steganography", slug: "steganography", description: "Hiding secrets in media and audio files", icon: "image" },
    { name: "Programming", slug: "programming", description: "Source code analysis, algorithms, and script execution", icon: "code" },
    { name: "Miscellaneous", slug: "miscellaneous", description: "Esoteric programming, trivia, and mixed challenges", icon: "box" }
  ];

  for (const cat of categoriesList) {
    await run(
      `INSERT OR IGNORE INTO categories (name, slug, description, icon) VALUES (?, ?, ?, ?)`,
      [cat.name, cat.slug, cat.description, cat.icon]
    );
  }

  const categoryRows = await all(`SELECT id, slug FROM categories`);
  const catMap = {};
  categoryRows.forEach(c => { catMap[c.slug] = c.id; });

  // 3. Admin & Demo Users
  const adminPassHash = await bcrypt.hash("Admin@123456", 10);
  await run(
    `INSERT OR IGNORE INTO users (username, email, password_hash, role, score, avatar) VALUES (?, ?, ?, ?, ?, ?)`,
    ["admin", "admin@xctf.io", adminPassHash, "admin", 0, "https://api.dicebear.com/7.x/bottts/svg?seed=admin"]
  );

  const demoUsers = [
    { username: "cyberpunk", email: "cyberpunk@xctf.io", score: 320, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=cyberpunk" },
    { username: "neo", email: "neo@xctf.io", score: 285, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=neo" },
    { username: "trinity", email: "trinity@xctf.io", score: 210, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=trinity" },
    { username: "morpheus", email: "morpheus@xctf.io", score: 140, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=morpheus" }
  ];

  const defaultUserPassHash = await bcrypt.hash("Password123!", 10);
  for (const u of demoUsers) {
    await run(
      `INSERT OR IGNORE INTO users (username, email, password_hash, role, score, avatar) VALUES (?, ?, ?, 'participant', ?, ?)`,
      [u.username, u.email, defaultUserPassHash, u.score, u.avatar]
    );
  }

  // 4. Seed 34 Challenges (Including 7 Beginner & 14 Easy Challenges)
  const challengesSeed = [
    // --- BEGINNER CATEGORY DIFFICULTY (7 Challenges) ---
    {
      title: "Sanity Check",
      slug: "sanity-check",
      catSlug: "miscellaneous",
      difficulty: "Beginner",
      points: 5,
      description: "Welcome to XCTF! Copy and paste the flag string provided right here to test the flag submission system: XCTF{welcome_to_xctf_competition}.",
      hints: JSON.stringify(["Copy 'XCTF{welcome_to_xctf_competition}' into the submission input.", "Click Submit to earn your first 5 points!"]),
      flag: "XCTF{welcome_to_xctf_competition}",
      author: "XCTF Welcome Team",
      url: "",
      files: JSON.stringify([])
    },
    {
      title: "View Source Code",
      slug: "view-source-code",
      catSlug: "web-exploitation",
      difficulty: "Beginner",
      points: 10,
      description: "Web browsers download HTML source code to display web pages. Right-click anywhere on the page and click 'View Page Source' to find the hidden HTML comment containing the flag!",
      hints: JSON.stringify(["Right-click anywhere on the target page and select 'View Page Source' (or press Ctrl+U / Cmd+Option+U).", "Look for an HTML comment formatted as <!-- XCTF{...} -->."]),
      flag: "XCTF{welcome_to_view_source_101}",
      author: "Web Squad",
      url: "p04c01",
      files: JSON.stringify([])
    },
    {
      title: "Speak Binary",
      slug: "speak-binary",
      catSlug: "cryptography",
      difficulty: "Beginner",
      points: 10,
      description: "Computers use 0s and 1s to store characters. Translate this binary string to ASCII text: 01011000 01000011 01010100 01000110 01111011 01100010 01101001 01101110 01100001 01110010 01111001 01011111 01101001 01110011 01011111 01100101 01100001 01110011 01111001 01111101.",
      hints: JSON.stringify(["Copy the binary numbers into an online 'Binary to Text' converter.", "Each group of 8 bits represents one character."]),
      flag: "XCTF{binary_is_easy}",
      author: "Crypto Basics",
      url: "",
      files: JSON.stringify([])
    },
    {
      title: "Simple Secret Shift",
      slug: "simple-secret-shift",
      catSlug: "cryptography",
      difficulty: "Beginner",
      points: 10,
      description: "Decipher this ROT13 encrypted message where every letter is shifted by 13 positions: KPGS{ebg13_vf_n_fvzcyr_pvcure}.",
      hints: JSON.stringify(["ROT13 shifts each letter by 13 steps in the alphabet.", "Use CyberChef or an online ROT13 decoder."]),
      flag: "XCTF{rot13_is_a_simple_cipher}",
      author: "Crypto Basics",
      url: "",
      files: JSON.stringify([])
    },
    {
      title: "Inspect the URL",
      slug: "inspect-the-url",
      catSlug: "web-exploitation",
      difficulty: "Beginner",
      points: 10,
      description: "Websites often pass parameters in the address bar (URL). Look closely at the web page URL or change show_flag=false to show_flag=true in your address bar.",
      hints: JSON.stringify(["Look at your browser's address bar after launching the target page.", "Change show_flag=false to show_flag=true in the URL and press Enter."]),
      flag: "XCTF{url_parameters_are_visible_2026}",
      author: "Web Squad",
      url: "p04c04/index.html?show_flag=false",
      files: JSON.stringify([])
    },
    {
      title: "Python Loop Decryption",
      slug: "python-loop-decryption",
      catSlug: "programming",
      difficulty: "Beginner",
      points: 15,
      description: "You are given a small Python script that reconstructs a secret flag by converting ASCII integer codes in a loop. Run or inspect the Python script to reveal the flag: char_codes = [88, 67, 84, 70, 123, 112, 121, 116, 104, 111, 110, 95, 108, 111, 111, 112, 115, 95, 97, 114, 101, 95, 101, 97, 115, 121, 125].",
      hints: JSON.stringify(["Run 'python3 -c \"print(\\'\\'.join(chr(c) for c in [88, 67, 84, 70, 123, 112, 121, 116, 104, 111, 110, 95, 108, 111, 111, 112, 115, 95, 97, 114, 101, 95, 101, 97, 115, 121, 125]))\"' in your terminal.", "The chr(code) function converts ASCII integer values to characters."]),
      flag: "XCTF{python_loops_are_easy}",
      author: "Python Mentor",
      url: "p05c01",
      files: JSON.stringify([])
    },
    {
      title: "Java String Assembly",
      slug: "java-string-assembly",
      catSlug: "programming",
      difficulty: "Beginner",
      points: 15,
      description: "A Java method builds a security flag by joining String array elements: String[] parts = {\"XCTF{\", \"java_\", \"string_\", \"arrays_\", \"2026\", \"}\"}. Concatenate the array elements in order to recover the flag.",
      hints: JSON.stringify(["Join the string array elements in order: XCTF{ + java_ + string_ + arrays_ + 2026 + }.", "Compile with 'javac FlagBuilder.java' and run with 'java FlagBuilder'."]),
      flag: "XCTF{java_string_arrays_2026}",
      author: "Java Instructor",
      url: "p05c02",
      files: JSON.stringify([])
    },

    // --- EASY CATEGORY DIFFICULTY (16 Challenges) ---
    {
      title: "Python Log Parser & Brute-Force Detector",
      slug: "python-log-parser",
      catSlug: "programming",
      difficulty: "Easy",
      points: 35,
      description: "A server authentication log contains login attempts. Write a Python script to parse the log lines, count FAILED attempts per IP address, filter IPs with MORE THAN 5 failures, sort them numerically/alphabetically, and format as XCTF{ip1_ip2}.",
      hints: JSON.stringify(["Use split() or regex to extract IP and status ('FAILED').", "Count occurrences with collections.Counter or a dictionary, filter count > 5, sort, and join with underscores."]),
      flag: "XCTF{172.16.0.4_192.168.1.10}",
      author: "SecOps Automator",
      url: "p06c01",
      files: JSON.stringify([])
    },
    {
      title: "Java XOR Stream Cipher Decryptor",
      slug: "java-xor-decryptor",
      catSlug: "programming",
      difficulty: "Easy",
      points: 35,
      description: "A malware payload obfuscated command & control data using single-byte XOR key 0x5A in Java. Write a Java loop to perform bitwise XOR (^) across byte[] encrypted = {0x02, 0x19, 0x0e, 0x1c, 0x21, 0x22, 0x35, 0x28, 0x05, 0x29, 0x2e, 0x28, 0x3f, 0x3b, 0x37, 0x05, 0x39, 0x33, 0x2a, 0x32, 0x3f, 0x28, 0x05, 0x68, 0x6a, 0x68, 0x6c, 0x27} to recover the flag.",
      hints: JSON.stringify(["XOR is symmetric: (encrypted[i] ^ 0x5A) reverses the encryption.", "Loop through byte array, XOR each byte with 0x5A, and convert to String."]),
      flag: "XCTF{xor_stream_cipher_2026}",
      author: "Crypto Developer",
      url: "p06c02",
      files: JSON.stringify([])
    },
    {
      title: "Python Network Hex Payload Decoder",
      slug: "python-hex-payload-decoder",
      catSlug: "programming",
      difficulty: "Easy",
      points: 35,
      description: "Security analysts intercepted suspicious network packet payloads exfiltrated from an internal workstation. The payload data was split into three hexadecimal string fragments: ['584354467b6e6574776f726b', '5f6865785f7061796c6f6164', '5f6465636f6465725f323032367d']. Write a Python script to decode each hex fragment into ASCII/UTF-8 text using bytes.fromhex() and concatenate them to reconstruct the exfiltrated flag.",
      hints: JSON.stringify(["Use bytes.fromhex(chunk).decode('utf-8') to convert each hex string into printable text.", "Concatenate the decoded string parts in order to recover the flag format XCTF{...}."]),
      flag: "XCTF{network_hex_payload_decoder_2026}",
      author: "SecOps Automator",
      url: "p06c03",
      files: JSON.stringify([])
    },
    {
      title: "Java Caesar Cipher Automated Key Finder",
      slug: "java-caesar-key-finder",
      catSlug: "programming",
      difficulty: "Easy",
      points: 35,
      description: "A ransomware payload obfuscated its C2 string using a Caesar cipher with an unknown key shift k in range 1..25. The encrypted string is 'CHYK{ofaf_hfjxfw_hnumjw_pjd_2026}'. Write a Java program that iterates candidate shift keys, applies a reverse letter shift on alphabetic characters, finds the plaintext starting with 'XCTF{', and recovers the decrypted flag.",
      hints: JSON.stringify(["Loop through shift keys from 1 to 25.", "For each character, shift letters backward: (c - 'a' - shift + 26) % 26 + 'a'. Check if the result starts with 'XCTF{'."]),
      flag: "XCTF{java_caesar_cipher_key_2026}",
      author: "Java Security Lab",
      url: "p06c04",
      files: JSON.stringify([])
    },
    {
      title: "Client Side is not good...",
      slug: "client-side-is-not-good",
      catSlug: "web-exploitation",
      difficulty: "Easy",
      points: 25,
      description: "Make sure you do not forget your password otherwise there is no option to reset your password. Inspect client side authorization routines to uncover credentials.",
      hints: JSON.stringify(["Check source code and client-side JavaScript logic.", "Encoding might conceal the flag."]),
      flag: "XCTF{client_side_is_bad_0101001}",
      author: "Level01",
      url: "p01c01",
      files: JSON.stringify([])
    },
    {
      title: "Admin Login",
      slug: "admin-login",
      catSlug: "web-exploitation",
      difficulty: "Easy",
      points: 15,
      description: "Someone sent a very important message to the admin. It seems like only admin users can view the messages.",
      hints: JSON.stringify(["Cookies dictate session state.", "Try modifying request headers or session cookies."]),
      flag: "XCTF{Cookies_are_everywhere_0102000}",
      author: "Level02",
      url: "p01c02",
      files: JSON.stringify([])
    },
    {
      title: "Moved Permanently",
      slug: "moved-permanently",
      catSlug: "web-exploitation",
      difficulty: "Easy",
      points: 20,
      description: "It seems like someone gave you a wrong URL. Follow HTTP 301/302 redirects carefully to trace the hidden destination.",
      hints: JSON.stringify(["Inspect HTTP response headers.", "Look for Location headers during redirection."]),
      flag: "XCTF{Redirects_are_importent}",
      author: "Level104",
      url: "p01c04",
      files: JSON.stringify([])
    },
    {
      title: "The login",
      slug: "the-login",
      catSlug: "web-exploitation",
      difficulty: "Easy",
      points: 10,
      description: "I wonder if the users are kept in a database? Test for classic SQL injection patterns in the login form.",
      hints: JSON.stringify(["Try ' OR '1'='1 payload.", "Always use prepared SQL statements!"]),
      flag: "XCTF{Always_use_prepared_SQL_statements}",
      author: "Level105",
      url: "p01c05",
      files: JSON.stringify([])
    },
    {
      title: "Mr. Robot",
      slug: "mr-robot",
      catSlug: "osint",
      difficulty: "Easy",
      points: 15,
      description: "Robots will do everything for you. Search engine crawlers follow directives listed in standard web files.",
      hints: JSON.stringify(["Check /robots.txt on the challenge server.", "Hidden paths are often disallowed."]),
      flag: "XCTF{Y0U_533_8U7_Y0U_D0_N07_0853RV3}",
      author: "Level106",
      url: "p01c06",
      files: JSON.stringify([])
    },
    {
      title: "The message",
      slug: "the-message",
      catSlug: "cryptography",
      difficulty: "Easy",
      points: 20,
      description: "Sherlock has sent you an encrypted message. Decipher historical substitution ciphers to reveal the secret.",
      hints: JSON.stringify(["Caesar/Rot13 or monoalphabetic substitution cipher.", "To a great mind, nothing is little."]),
      flag: "XCTF{to_a_great_mind_nothing_is_little}",
      author: "Level107",
      url: "p01c07",
      files: JSON.stringify([])
    },
    {
      title: "Take a close look",
      slug: "take-a-close-look",
      catSlug: "steganography",
      difficulty: "Easy",
      points: 15,
      description: "A secret message is embedded inside an image file. Use steganographic extraction tools to inspect LSB bits.",
      hints: JSON.stringify(["Check EXIF metadata or strings inside image file.", "Inspect least significant bits."]),
      flag: "XCTF{hidden_in_plain_sight_stego}",
      author: "Level10",
      url: "11",
      files: JSON.stringify([])
    },
    {
      title: "Header Inspection",
      slug: "header-inspection",
      catSlug: "web-exploitation",
      difficulty: "Easy",
      points: 30,
      description: "A secret flag is passed inside custom HTTP response headers from the server. Inspect response headers.",
      hints: JSON.stringify(["Inspect HTTP response headers using browser developer tools (Network tab) or curl -I.", "Look for custom header 'X-Secret-Flag'."]),
      flag: "XCTF{headers_contain_secrets_9921}",
      author: "CyberSec Operative",
      url: "p03c01",
      files: JSON.stringify([])
    },
    {
      title: "Base64 Cipher",
      slug: "base64-cipher",
      catSlug: "cryptography",
      difficulty: "Easy",
      points: 35,
      description: "An intercepted agent communication contains encoded text: WENURntiYXNlNjRfZW5jb2RpbmdfaXNfbm90X2VuY3J5cHRpb25fNzg5MH0=. Decode it.",
      hints: JSON.stringify(["The string ends with '=' padding.", "Use Base64 decode utility or CyberChef."]),
      flag: "XCTF{base64_encoding_is_not_encryption_7890}",
      author: "Crypto Lab",
      url: "p03c02",
      files: JSON.stringify([])
    },
    {
      title: "Exif Metadata Leak",
      slug: "exif-metadata-leak",
      catSlug: "digital-forensics",
      difficulty: "Easy",
      points: 40,
      description: "A mysterious image file was posted online. The photographer forgot to strip camera metadata prior to uploading.",
      hints: JSON.stringify(["Use an online EXIF viewer or strings command.", "Check the 'UserComment' metadata tag."]),
      flag: "XCTF{exif_metadata_reveals_location_1029}",
      author: "Forensics Unit",
      url: "p03c03",
      files: JSON.stringify([])
    },
    {
      title: "Hidden DOM Element",
      slug: "hidden-dom-element",
      catSlug: "web-exploitation",
      difficulty: "Easy",
      points: 25,
      description: "The secret flag is rendered inside the web page document but invisible to regular eyes. Find the hidden HTML element.",
      hints: JSON.stringify(["Inspect DOM tree using Elements tab in DevTools.", "Look for elements styled with display: none or opacity: 0."]),
      flag: "XCTF{css_hidden_elements_are_visible_5432}",
      author: "Web Squad",
      url: "p03c04",
      files: JSON.stringify([])
    },
    {
      title: "WHOIS Reconnaissance",
      slug: "whois-reconnaissance",
      catSlug: "osint",
      difficulty: "Easy",
      points: 30,
      description: "A rogue hacker registered domain shadow-corp-cyber.org. Find the registered organization name in public WHOIS records.",
      hints: JSON.stringify(["Perform a WHOIS lookup or search domain registrar records.", "Format is XCTF{Registrant_Org_Name}."]),
      flag: "XCTF{ShadowCorp_Defense_Systems_2026}",
      author: "OSINT Intelligence",
      url: "p03c05",
      files: JSON.stringify([])
    },

    // --- MEDIUM (7 Challenges) ---
    {
      title: "The Sign of two five six",
      slug: "the-sign-of-two-five-six",
      catSlug: "cryptography",
      difficulty: "Medium",
      points: 100,
      description: "The developer of the site is a true fan of encryption. Cryptanalysis of SHA-256 hashes and common password dictionaries.",
      hints: JSON.stringify(["Analyze the cipher text format.", "Check for weak encryption implementation."]),
      flag: "XCTF{Common_passwords_brings_bad_luck}",
      author: "Level103",
      url: "p01c03",
      files: JSON.stringify([])
    },
    {
      title: "The Sixth Flag",
      slug: "the-sixth-flag",
      catSlug: "binary-exploitation",
      difficulty: "Medium",
      points: 110,
      description: "Analyze binary execution flow, stack alignment, and overflow vulnerabilities to hijack execution path.",
      hints: JSON.stringify(["Check stack buffer boundaries.", "Overwrite return pointer on stack."]),
      flag: "XCTF{buffer_overflow_master_2026}",
      author: "Level09",
      url: "p02c01",
      files: JSON.stringify([])
    },
    {
      title: "JWT Signature Bypass",
      slug: "jwt-signature-bypass",
      catSlug: "web-exploitation",
      difficulty: "Medium",
      points: 120,
      description: "The target API accepts JSON Web Tokens for authentication. Test for algorithm confusion ('none' alg vulnerability) to impersonate admin.",
      hints: JSON.stringify(["Decode the JWT header, payload, and signature.", "Try changing header 'alg' to 'none'."]),
      flag: "XCTF{jwt_none_alg_bypass_vulnerability_8812}",
      author: "API Security Team",
      url: "p03c06",
      files: JSON.stringify([])
    },
    {
      title: "Vigenère Cipher Analysis",
      slug: "vigenere-cipher-analysis",
      catSlug: "cryptography",
      difficulty: "Medium",
      points: 140,
      description: "Intercepted ciphertext: FRXW{yhnrqxuh_flskhu_dndcxvlv_3321} encrypted using Vigenère key 'KEY'. Decrypt the message.",
      hints: JSON.stringify(["Use frequency analysis or known key 'KEY'.", "CyberChef Vigenere Decode tool with key 'KEY'."]),
      flag: "XCTF{vigenere_cipher_analysis_3321}",
      author: "Cryptanalysis Ops",
      url: "p03c07",
      files: JSON.stringify([])
    },
    {
      title: "PCAP Packet Extraction",
      slug: "pcap-packet-extraction",
      catSlug: "digital-forensics",
      difficulty: "Medium",
      points: 150,
      description: "Analyze a network packet capture file to extract an unencrypted HTTP POST request containing login credentials.",
      hints: JSON.stringify(["Filter packets in Wireshark with 'http.request.method == POST'.", "Look for cleartext form parameters."]),
      flag: "XCTF{pcap_packet_inspection_master_4490}",
      author: "Network Forensics",
      url: "p03c08",
      files: JSON.stringify([])
    },
    {
      title: "String Extraction & Reverse",
      slug: "string-extraction-and-reverse",
      catSlug: "reverse-engineering",
      difficulty: "Medium",
      points: 130,
      description: "A compiled ELF binary contains hardcoded obfuscated strings. Decompile or run string disassembly to reconstruct the flag.",
      hints: JSON.stringify(["Run 'strings' command on binary or open in Ghidra.", "Search for text array initialized in main()."]),
      flag: "XCTF{reverse_elf_binary_strings_6612}",
      author: "Reversing Team",
      url: "p03c09",
      files: JSON.stringify([])
    },
    {
      title: "SQLi Error-Based Extraction",
      slug: "sqli-error-based-extraction",
      catSlug: "web-exploitation",
      difficulty: "Medium",
      points: 125,
      description: "Extract the secret column from the flags table using error-based or UNION-based SQL injection.",
      hints: JSON.stringify(["Inject single quote (') to trigger SQL error.", "Use UNION SELECT 1, column_name FROM flags-- payload."]),
      flag: "XCTF{union_based_sqli_exfiltration_7719}",
      author: "Database Security",
      url: "p03c10",
      files: JSON.stringify([])
    },

    // --- HARD (6 Challenges) ---
    {
      title: "The Password",
      slug: "the-password",
      catSlug: "reverse-engineering",
      difficulty: "Hard",
      points: 200,
      description: "Analyze the repository history and source code logic to reconstruct the hardcoded master passkey.",
      hints: JSON.stringify(["Inspect git logs or commit history.", "Look for exposed credentials in previous commits."]),
      flag: "XCTF{The_Game_is_Afoot}",
      author: "Level108",
      url: "p01c08",
      files: JSON.stringify([])
    },
    {
      title: "Format String Vulnerability",
      slug: "format-string-vulnerability",
      catSlug: "binary-exploitation",
      difficulty: "Hard",
      points: 250,
      description: "Exploit a printf format string vulnerability (printf(user_input)) to read arbitrary memory addresses on the stack.",
      hints: JSON.stringify(["Pass '%x %x %x %x' or '%p %p %p' as input.", "Dereference pointers on stack using '%s'."]),
      flag: "XCTF{format_string_stack_leak_pwn_9901}",
      author: "Pwn Lab",
      url: "p03c11",
      files: JSON.stringify([])
    },
    {
      title: "RSA Small Exponent Attack",
      slug: "rsa-small-exponent-attack",
      catSlug: "cryptography",
      difficulty: "Hard",
      points: 300,
      description: "An RSA implementation uses public exponent e = 3 without proper message padding. Perform a cube root attack on ciphertext c.",
      hints: JSON.stringify(["When e=3 and m^3 < N, ciphertext c equals m^3 directly.", "Take integer cube root of ciphertext."]),
      flag: "XCTF{rsa_small_exponent_cube_root_attack_4412}",
      author: "Crypto Lab",
      url: "p03c12",
      files: JSON.stringify([])
    },
    {
      title: "Return-Oriented Programming (ROP)",
      slug: "return-oriented-programming",
      catSlug: "binary-exploitation",
      difficulty: "Hard",
      points: 350,
      description: "NX/DEP bit is enabled on the target binary. Construct a ROP chain using gadgets to call system('/bin/sh').",
      hints: JSON.stringify(["Find gadgets using ROPgadget or ropper.", "Pop arguments into rdi register before calling system()."]),
      flag: "XCTF{rop_chain_gadget_mastery_5589}",
      author: "Exploit Ops",
      url: "p03c13",
      files: JSON.stringify([])
    },
    {
      title: "Custom Stego LSB Extraction",
      slug: "custom-stego-lsb-extraction",
      catSlug: "steganography",
      difficulty: "Hard",
      points: 280,
      description: "A secret message is hidden in the Least Significant Bits (LSB) of the red color channel of a PNG image.",
      hints: JSON.stringify(["Extract LSB of Red byte values (pixel & 1).", "Reconstruct ASCII character bytes from every 8 bits."]),
      flag: "XCTF{lsb_red_channel_stego_matrix_1120}",
      author: "Stego Analysis",
      url: "p03c14",
      files: JSON.stringify([])
    },
    {
      title: "SSRF to Internal Admin Panel",
      slug: "ssrf-to-internal-admin",
      catSlug: "web-exploitation",
      difficulty: "Hard",
      points: 320,
      description: "Exploit Server-Side Request Forgery (SSRF) in a PDF generator service to access http://127.0.0.1:8080/admin/flag.",
      hints: JSON.stringify(["Inject internal loopback URL http://localhost:8080/admin/flag into PDF rendering engine.", "Bypass IP filters using 127.0.0.1 or decimal IP notation."]),
      flag: "XCTF{ssrf_internal_network_pivot_3391}",
      author: "Web Security Team",
      url: "p03c15",
      files: JSON.stringify([])
    }
  ];

  for (const ch of challengesSeed) {
    const catId = catMap[ch.catSlug] || 1;
    await run(
      `INSERT OR IGNORE INTO challenges (title, slug, category_id, difficulty, points, description, hints, flag, author, url, files) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ch.title, ch.slug, catId, ch.difficulty, ch.points, ch.description, ch.hints, ch.flag, ch.author, ch.url, ch.files]
    );

    // Update existing database rows
    await run(
      `UPDATE challenges SET difficulty = ?, points = ?, hints = ?, description = ? WHERE slug = ?`,
      [ch.difficulty, ch.points, ch.hints, ch.description, ch.slug]
    );
  }

  // 5. Seed Achievements
  const achievementsList = [
    { key: "first_blood", title: "First Blood", description: "Be the first participant to solve a challenge", icon: "zap", points: 50 },
    { key: "web_hunter", title: "Web Hunter", description: "Solve your first Web Exploitation challenge", icon: "globe", points: 25 },
    { key: "crypto_breaker", title: "Crypto Breaker", description: "Break your first Cryptography challenge", icon: "lock", points: 25 },
    { key: "rookie", title: "Cyber Rookie", description: "Successfully solve 3 challenges", icon: "shield", points: 30 },
    { key: "century_club", title: "Century Club", description: "Accumulate at least 100 points in the competition", icon: "award", points: 50 }
  ];

  for (const ach of achievementsList) {
    await run(
      `INSERT OR IGNORE INTO achievements (key, title, description, icon, points) VALUES (?, ?, ?, ?, ?)`,
      [ach.key, ach.title, ach.description, ach.icon, ach.points]
    );
  }

  // 6. Seed Mini CTFs
  const miniCtfsList = [
    {
      title: "Web Security Speedrun",
      slug: "web-security-speedrun",
      description: "Test your speed on 3 web security challenges: Inspect client side source code, parameter manipulation, and hidden credentials.",
      difficulty: "Easy",
      category: "Web Exploitation",
      status: "Active",
      visibility: "Public",
      challengeSlugs: ["view-source-code", "inspect-the-url", "client-side-is-not-good"]
    },
    {
      title: "Cryptography Sprint",
      slug: "crypto-sprint",
      description: "Solve a sequence of cryptography missions: Binary decoding, ROT13 cipher decryption, and Caesar key brute-forcing.",
      difficulty: "Easy",
      category: "Cryptography",
      status: "Active",
      visibility: "Public",
      challengeSlugs: ["speak-binary", "simple-secret-shift", "java-caesar-key-finder"]
    },
    {
      title: "Incident Response & Forensics Gauntlet",
      slug: "forensics-gauntlet",
      description: "Analyze raw logs, reverse XOR malware stream ciphers, and decode hex packet streams in Python & Java.",
      difficulty: "Medium",
      category: "Digital Forensics",
      status: "Active",
      visibility: "Public",
      challengeSlugs: ["python-log-parser", "java-xor-decryptor", "python-hex-payload-decoder"]
    }
  ];

  for (const mctf of miniCtfsList) {
    await run(
      `INSERT OR IGNORE INTO mini_ctfs (title, slug, description, difficulty, category, status, visibility, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [mctf.title, mctf.slug, mctf.description, mctf.difficulty, mctf.category, mctf.status, mctf.visibility]
    );

    const mRow = await get(`SELECT id FROM mini_ctfs WHERE slug = ?`, [mctf.slug]);
    if (mRow) {
      let order = 1;
      for (const chSlug of mctf.challengeSlugs) {
        const chRow = await get(`SELECT id FROM challenges WHERE slug = ?`, [chSlug]);
        if (chRow) {
          await run(
            `INSERT OR IGNORE INTO mini_ctf_challenges (mini_ctf_id, challenge_id, sequence_order) VALUES (?, ?, ?)`,
            [mRow.id, chRow.id, order++]
          );
        }
      }
    }
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDatabase
};
