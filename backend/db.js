const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed users matching database.sql fields
const seedUsers = [
  {
    id: 1,
    name: "Alex Rivera",
    email: "alex@university.edu",
    password: "password123",
    student_id: "CS-2024-001",
    batch: "2024",
    phone: "+1 (555) 234-5678",
    description: "Computer Science major passionate about AI, React frontend development, and UX design."
  },
  {
    id: 2,
    name: "Sarah Chen",
    email: "sarah@university.edu",
    password: "password123",
    student_id: "SE-2023-042",
    batch: "2023",
    phone: "+1 (555) 876-5432",
    description: "Software Engineering senior focused on Data Structures, Python backend APIs, and SQL."
  },
  {
    id: 3,
    name: "Marcus Vance",
    email: "marcus@university.edu",
    password: "password123",
    student_id: "DS-2024-018",
    batch: "2024",
    phone: "+1 (555) 345-6789",
    description: "Data Science student looking to master Node.js while teaching Machine Learning basics."
  }
];

// Initial seed posts matching database.sql fields
const seedPosts = [
  {
    id: 1,
    user_id: 1,
    teach_skill: "React & Modern CSS UI",
    learn_skill: "Python & Data Structures",
    description: "I can guide you through building interactive Web UIs using React & Vite. Looking for help with LeetCode Python problems!",
    video_url: "https://www.youtube.com/embed/w7ejDZ8SWv8",
    document_url: "https://react.dev/learn"
  },
  {
    id: 2,
    user_id: 2,
    teach_skill: "Python & SQL Databases",
    learn_skill: "Figma UI/UX & Web Design",
    description: "Experienced in writing clean Python scripts and SQL database design. Want to learn modern UI layout design.",
    video_url: "https://www.youtube.com/embed/rfscVS0vtbw",
    document_url: "https://docs.python.org/3/tutorial/index.html"
  },
  {
    id: 3,
    user_id: 3,
    teach_skill: "Machine Learning Basics & pandas",
    learn_skill: "Node.js REST APIs",
    description: "Can teach data analysis with pandas/numpy and simple scikit-learn ML models. Need guidance building Express backends.",
    video_url: "https://www.youtube.com/embed/i_LwzRVP7bg",
    document_url: "https://pandas.pydata.org/docs/user_guide/index.html"
  }
];

// Initial seed messages
const seedMessages = [
  {
    id: 1,
    sender_id: 1,
    receiver_id: 2,
    message: "Hi Sarah! I saw your post on Python & SQL databases. I can teach you React & UI design!",
    timestamp: "2026-09-19T10:15:00.000Z"
  },
  {
    id: 2,
    sender_id: 2,
    receiver_id: 1,
    message: "Hey Alex! That sounds awesome. When are you free for a study session?",
    timestamp: "2026-09-19T10:18:30.000Z"
  },
  {
    id: 3,
    sender_id: 3,
    receiver_id: 1,
    message: "Hey Alex, interested in Machine Learning basics? I saw you teach React.",
    timestamp: "2026-09-19T11:00:00.000Z"
  }
];

function loadJSON(filepath, defaultData) {
  try {
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, JSON.stringify(defaultData, null, 2), "utf8");
      return defaultData;
    }
    const raw = fs.readFileSync(filepath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filepath}:`, err.message);
    return defaultData;
  }
}

function saveJSON(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Error writing ${filepath}:`, err.message);
  }
}

class LocalDB {
  constructor() {
    this.users = loadJSON(USERS_FILE, seedUsers);
    this.posts = loadJSON(POSTS_FILE, seedPosts);
    this.messages = loadJSON(MESSAGES_FILE, seedMessages);
  }

  // Find user by email
  findUserByEmail(email) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  // Find user by ID
  findUserById(id) {
    const numId = Number(id);
    return this.users.find((u) => u.id === numId);
  }

  // Get all users sanitized (no passwords)
  getAllUsers() {
    return this.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      student_id: u.student_id,
      batch: u.batch,
      phone: u.phone,
      description: u.description
    }));
  }

  // Create new user
  createUser(userData) {
    const existing = this.findUserByEmail(userData.email);
    if (existing) {
      throw new Error("Email already exists");
    }

    const nextId = this.users.length > 0 ? Math.max(...this.users.map((u) => u.id)) + 1 : 1;
    const newUser = {
      id: nextId,
      name: userData.name || "",
      email: userData.email || "",
      password: userData.password || "",
      student_id: userData.student_id || "",
      batch: userData.batch || "",
      phone: userData.phone || "",
      description: userData.description || ""
    };

    this.users.push(newUser);
    saveJSON(USERS_FILE, this.users);
    return newUser;
  }

  // Authenticate user
  loginUser(email, password) {
    const user = this.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    return user || null;
  }

  // Create new post
  createPost(postData) {
    const nextId = this.posts.length > 0 ? Math.max(...this.posts.map((p) => p.id)) + 1 : 1;
    const newPost = {
      id: nextId,
      user_id: Number(postData.user_id),
      teach_skill: postData.teach_skill || "",
      learn_skill: postData.learn_skill || "",
      description: postData.description || "",
      video_url: postData.video_url || "",
      document_url: postData.document_url || ""
    };

    this.posts.push(newPost);
    saveJSON(POSTS_FILE, this.posts);
    return newPost;
  }

  // Get all posts joined with user profile info with optional search query & category filter
  getPostsJoined(searchQuery = "", category = "all") {
    // Sort descending by post ID (newest first)
    const sortedPosts = [...this.posts].sort((a, b) => b.id - a.id);
    let joined = sortedPosts.map((post) => {
      const user = this.users.find((u) => u.id === post.user_id) || {};
      return {
        id: post.id,
        user_id: post.user_id,
        teach_skill: post.teach_skill,
        learn_skill: post.learn_skill,
        description: post.description,
        video_url: post.video_url || "",
        document_url: post.document_url || "",
        name: user.name || "Anonymous",
        student_id: user.student_id || "N/A",
        batch: user.batch || "N/A",
        phone: user.phone || "N/A",
        email: user.email || "",
        profile_description: user.description || ""
      };
    });

    const q = searchQuery ? searchQuery.toLowerCase().trim() : "";
    const cat = category ? category.toLowerCase().trim() : "all";

    if (q || cat !== "all") {
      joined = joined.filter((p) => {
        if (cat === "teach") {
          return q ? p.teach_skill?.toLowerCase().includes(q) : Boolean(p.teach_skill);
        }
        if (cat === "learn") {
          return q ? p.learn_skill?.toLowerCase().includes(q) : Boolean(p.learn_skill);
        }
        if (cat === "students") {
          return q
            ? p.name?.toLowerCase().includes(q) ||
                p.student_id?.toLowerCase().includes(q) ||
                p.batch?.toLowerCase().includes(q) ||
                p.email?.toLowerCase().includes(q)
            : Boolean(p.name);
        }
        // "all"
        return (
          p.teach_skill?.toLowerCase().includes(q) ||
          p.learn_skill?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q) ||
          p.student_id?.toLowerCase().includes(q) ||
          p.batch?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.profile_description?.toLowerCase().includes(q)
        );
      });
    }

    return joined;
  }


  // --- MESSAGING SYSTEM (STORES IN RAW FORMAT JSON IN BACKEND/DATA/MESSAGES.JSON) ---

  // Send / Create a message
  createMessage({ sender_id, receiver_id, message }) {
    const sId = Number(sender_id);
    const rId = Number(receiver_id);

    if (!sId || !rId || !message || !message.trim()) {
      throw new Error("Invalid sender, receiver, or empty message");
    }

    const sender = this.findUserById(sId);
    const receiver = this.findUserById(rId);
    if (!sender || !receiver) {
      throw new Error("Sender or Receiver user not found");
    }

    const nextId = this.messages.length > 0 ? Math.max(...this.messages.map((m) => m.id)) + 1 : 1;
    const newMsg = {
      id: nextId,
      sender_id: sId,
      receiver_id: rId,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    this.messages.push(newMsg);
    // Persist immediately to raw JSON format file on local device disk
    saveJSON(MESSAGES_FILE, this.messages);
    return newMsg;
  }

  // Get conversation messages between two specific users
  getMessagesBetween(user1Id, user2Id) {
    const u1 = Number(user1Id);
    const u2 = Number(user2Id);

    const thread = this.messages.filter(
      (m) =>
        (m.sender_id === u1 && m.receiver_id === u2) ||
        (m.sender_id === u2 && m.receiver_id === u1)
    );

    // Sort chronologically ascending
    return thread.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // Get all conversation contact summaries for a particular user
  getUserConversations(userId) {
    const uId = Number(userId);
    const userMessages = this.messages.filter(
      (m) => m.sender_id === uId || m.receiver_id === uId
    );

    // Identify unique contact user IDs
    const contactIds = new Set();
    userMessages.forEach((m) => {
      if (m.sender_id !== uId) contactIds.add(m.sender_id);
      if (m.receiver_id !== uId) contactIds.add(m.receiver_id);
    });

    const conversations = [];
    contactIds.forEach((contactId) => {
      const contactUser = this.findUserById(contactId);
      if (!contactUser) return;

      const thread = userMessages
        .filter((m) => m.sender_id === contactId || m.receiver_id === contactId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const latestMsg = thread[0];

      conversations.push({
        contact: {
          id: contactUser.id,
          name: contactUser.name,
          email: contactUser.email,
          student_id: contactUser.student_id,
          batch: contactUser.batch,
          phone: contactUser.phone,
          description: contactUser.description
        },
        latestMessage: latestMsg ? latestMsg.message : "",
        timestamp: latestMsg ? latestMsg.timestamp : null,
        totalMessages: thread.length
      });
    });

    // Sort by latest message timestamp descending
    return conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

module.exports = new LocalDB();

