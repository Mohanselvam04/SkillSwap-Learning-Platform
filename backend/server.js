const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

console.log("SkillSwap Local JSON Database Ready!");

app.get("/", (req, res) => {
  res.json({ message: "SkillSwap API is running (Local Database Mode)" });
});

// 1. Signup Route
app.post("/api/signup", (req, res) => {
  try {
    const { name, email, password, student_id, batch, phone, description } = req.body;
    
    if (!name || !email || !password || !student_id || !batch || !phone) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    const newUser = db.createUser({ name, email, password, student_id, batch, phone, description });
    res.json({ message: "Signup successful", userId: newUser.id });
  } catch (err) {
    res.status(400).json({ message: err.message || "Email already exists or invalid data" });
  }
});

// 2. Login Route
app.post("/api/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Provide email and password" });
    }

    const u = db.loginUser(email, password);
    if (!u) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      id: u.id,
      name: u.name,
      email: u.email,
      student_id: u.student_id,
      batch: u.batch,
      phone: u.phone,
      description: u.description
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during login" });
  }
});

// 3. Create Post Route
app.post("/api/posts", (req, res) => {
  try {
    const { user_id, teach_skill, learn_skill, description, video_url, document_url } = req.body;
    if (!user_id || !teach_skill || !learn_skill) {
      return res.status(400).json({ message: "Please provide user ID, skill to teach, and skill to learn." });
    }

    const newPost = db.createPost({ user_id, teach_skill, learn_skill, description, video_url, document_url });
    res.json({ message: "Skill posted successfully", id: newPost.id });
  } catch (err) {
    res.status(400).json({ message: "Could not create post" });
  }
});

// 4. Get Posts Route (with optional search and category filter)
app.get("/api/posts", (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const category = req.query.category || "all";
    const posts = db.getPostsJoined(searchQuery, category);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching posts" });
  }
});


// 5. Get All Registered Users Route (for Messaging contact list)
app.get("/api/users", (req, res) => {
  try {
    const users = db.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching users" });
  }
});

// 6. Send Message Route (Stores in raw format JSON in backend/data/messages.json)
app.post("/api/messages", (req, res) => {
  try {
    const { sender_id, receiver_id, message } = req.body;
    if (!sender_id || !receiver_id || !message) {
      return res.status(400).json({ message: "Please provide sender_id, receiver_id, and message content." });
    }

    const newMsg = db.createMessage({ sender_id, receiver_id, message });
    res.json({ message: "Message sent successfully", data: newMsg });
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not send message" });
  }
});

// 7. Get Thread Messages between two users
app.get("/api/messages", (req, res) => {
  try {
    const { user1, user2 } = req.query;
    if (!user1 || !user2) {
      return res.status(400).json({ message: "Please specify user1 and user2 query parameters." });
    }

    const thread = db.getMessagesBetween(user1, user2);
    res.json(thread);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching messages" });
  }
});

// 8. Get User Conversations List
app.get("/api/messages/conversations/:userId", (req, res) => {
  try {
    const conversations = db.getUserConversations(req.params.userId);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching conversations" });
  }
});

// 9. Raw JSON Storage Export Endpoint
app.get("/api/messages/raw/:userId", (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const userMessages = db.messages.filter(
      (m) => m.sender_id === userId || m.receiver_id === userId
    );
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="messages_user_${userId}_raw.json"`);
    res.send(JSON.stringify(userMessages, null, 2));
  } catch (err) {
    res.status(500).json({ message: "Server error exporting raw JSON messages" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SkillSwap server running on port ${PORT}`));