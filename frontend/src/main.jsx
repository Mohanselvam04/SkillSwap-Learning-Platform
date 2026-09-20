import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = "http://localhost:5000/api";

function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("skillswap_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [form, setForm] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [connectModal, setConnectModal] = useState(null);
  const [selectedPostDetail, setSelectedPostDetail] = useState(null);
  const [copied, setCopied] = useState(false);

  // Messaging States
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [activeThread, setActiveThread] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const chatBottomRef = useRef(null);

  // Sync user state with localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("skillswap_user", JSON.stringify(user));
      loadPosts();
      loadConversations();
      loadAllUsers();
    } else {
      localStorage.removeItem("skillswap_user");
    }
  }, [user]);

  const loadPosts = (query = search, cat = searchCategory) => {
    const params = new URLSearchParams();
    if (query) params.append("search", query);
    if (cat && cat !== "all") params.append("category", cat);

    const queryString = params.toString();
    const url = queryString ? `${API}/posts?${queryString}` : `${API}/posts`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPosts(data);
      })
      .catch((err) => console.error("Error loading posts:", err));
  };

  const loadAllUsers = () => {
    fetch(`${API}/users`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAllUsers(data);
      })
      .catch((err) => console.error("Error loading users:", err));
  };

  const loadConversations = () => {
    if (!user) return;
    fetch(`${API}/messages/conversations/${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setConversations(data);
      })
      .catch((err) => console.error("Error loading conversations:", err));
  };

  const loadThread = (contactId) => {
    if (!user || !contactId) return;
    fetch(`${API}/messages?user1=${user.id}&user2=${contactId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActiveThread(data);
          localStorage.setItem(`skillswap_messages_${user.id}_${contactId}`, JSON.stringify(data, null, 2));
        }
      })
      .catch((err) => console.error("Error loading thread:", err));
  };

  useEffect(() => {
    if (user && page === "home") {
      loadPosts(search, searchCategory);
    } else if (user && page === "messages") {
      loadConversations();
      loadAllUsers();
      if (activeContact) {
        loadThread(activeContact.id);
      }
    }
  }, [page, activeContact]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThread]);

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrorMsg("");
  };

  const signup = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    fetch(API + "/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "Signup failed");
        return data;
      })
      .then(() => {
        setSuccessMsg("Account created successfully! Please log in.");
        setForm({});
        setPage("login");
      })
      .catch((err) => setErrorMsg(err.message));
  };

  const login = (e) => {
    e.preventDefault();
    setErrorMsg("");

    fetch(API + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "Invalid credentials");
        return data;
      })
      .then((x) => {
        if (x.id) {
          setUser(x);
          setForm({});
          setPage("home");
        } else {
          setErrorMsg(x.message || "Login failed");
        }
      })
      .catch((err) => setErrorMsg(err.message));
  };

  const createPost = (e) => {
    e.preventDefault();
    setErrorMsg("");

    fetch(API + "/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, user_id: user.id })
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "Failed to post skill");
        return data;
      })
      .then(() => {
        setForm({});
        loadPosts(search, searchCategory);
        setPage("home");
      })
      .catch((err) => setErrorMsg(err.message));
  };

  const openChatWithUser = (targetUser) => {
    if (!targetUser || targetUser.id === user.id) return;
    setActiveContact(targetUser);
    setPage("messages");
    loadThread(targetUser.id);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeContact) return;

    const payload = {
      sender_id: user.id,
      receiver_id: activeContact.id,
      message: messageInput.trim()
    };

    fetch(`${API}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "Failed to send message");
        return data;
      })
      .then(() => {
        setMessageInput("");
        loadThread(activeContact.id);
        loadConversations();
      })
      .catch((err) => console.error("Error sending message:", err));
  };

  // Export Raw JSON File to Local Device
  const exportRawJson = () => {
    if (!activeContact && activeThread.length === 0) return;
    const exportData = {
      app: "SkillSwap",
      export_date: new Date().toISOString(),
      user: { id: user.id, name: user.name, email: user.email },
      contact: activeContact ? { id: activeContact.id, name: activeContact.name, email: activeContact.email } : null,
      raw_messages_json: activeThread
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skillswap_messages_${activeContact ? activeContact.name.replace(/\s+/g, "_") : "chat"}_raw.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const logout = () => {
    setUser(null);
    setPage("login");
    setForm({});
    setActiveContact(null);
    setActiveThread([]);
  };

  const copyPhone = (phone) => {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- LOGIN PAGE ---
  if (!user && page === "login") {
    return (
      <div className="auth-wrapper">
        <div className="box">
          <div className="brand" style={{ justifyContent: "center", marginBottom: "8px" }}>
            SkillSwap <span className="brand-badge">MVP</span>
          </div>
          <h1>Welcome Back</h1>
          <p className="subtitle">Sign in to exchange skills with fellow students</p>

          {errorMsg && <div className="alert-toast">{errorMsg}</div>}
          {successMsg && <div className="success-toast">{successMsg}</div>}

          <form onSubmit={login}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                name="email"
                type="email"
                placeholder="student@university.edu"
                onChange={change}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                onChange={change}
                required
              />
            </div>
            <button className="w-full" style={{ marginTop: "12px" }}>
              Sign In
            </button>
          </form>
          <div className="auth-switch">
            Don't have an account?{" "}
            <span onClick={() => { setPage("signup"); setErrorMsg(""); setSuccessMsg(""); }}>
              Sign Up
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- SIGNUP PAGE ---
  if (!user && page === "signup") {
    return (
      <div className="auth-wrapper" style={{ padding: "40px 0" }}>
        <div className="box" style={{ maxWidth: "480px" }}>
          <div className="brand" style={{ justifyContent: "center", marginBottom: "8px" }}>
            SkillSwap <span className="brand-badge">MVP</span>
          </div>
          <h1>Join SkillSwap</h1>
          <p className="subtitle">Connect and trade skills with students nearby</p>

          {errorMsg && <div className="alert-toast">{errorMsg}</div>}

          <form onSubmit={signup}>
            <div className="form-group">
              <label>Full Name</label>
              <input name="name" placeholder="John Doe" onChange={change} required />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input name="email" type="email" placeholder="john@university.edu" onChange={change} required />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" placeholder="Choose a secure password" onChange={change} required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label>Student ID</label>
                <input name="student_id" placeholder="CS-2024-101" onChange={change} required />
              </div>
              <div className="form-group">
                <label>Batch / Year</label>
                <input name="batch" placeholder="2024" onChange={change} required />
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number (Revealed on Connect)</label>
              <input name="phone" placeholder="+1 (555) 123-4567" onChange={change} required />
            </div>

            <div className="form-group">
              <label>About You (Short Description)</label>
              <textarea name="description" placeholder="Briefly describe your background or interests..." onChange={change} />
            </div>

            <button className="w-full" style={{ marginTop: "12px" }}>
              Create Account
            </button>
          </form>
          <div className="auth-switch">
            Already have an account?{" "}
            <span onClick={() => { setPage("login"); setErrorMsg(""); }}>
              Sign In
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- DISTINCT CATEGORY SEGREGATION FILTERING ---
  const q = search.toLowerCase().trim();
  const cat = searchCategory;

  // Filter posts for All / Teach / Learn views
  const filteredPosts = posts.filter((p) => {
    if (cat === "teach") {
      return q ? p.teach_skill?.toLowerCase().includes(q) : Boolean(p.teach_skill);
    }
    if (cat === "learn") {
      return q ? p.learn_skill?.toLowerCase().includes(q) : Boolean(p.learn_skill);
    }
    // "all" category
    if (!q) return true;
    return (
      p.teach_skill?.toLowerCase().includes(q) ||
      p.learn_skill?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.profile_description?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.student_id?.toLowerCase().includes(q) ||
      p.batch?.toLowerCase().includes(q)
    );
  });

  // Filter student directory for Students view mode
  const filteredStudents = allUsers.filter((u) => {
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.student_id.toLowerCase().includes(q) ||
      u.batch.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.description && u.description.toLowerCase().includes(q))
    );
  });

  // Filter contacts list in Messaging sidebar
  const contactsList = allUsers.filter(
    (u) =>
      u.id !== user.id &&
      (u.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        u.student_id.toLowerCase().includes(contactSearch.toLowerCase()) ||
        u.batch.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  return (
    <div className="app-container">
      {/* Header Navigation */}
      <header className="navbar">
        <div className="brand" style={{ cursor: "pointer" }} onClick={() => setPage("home")}>
          SkillSwap <span className="brand-badge">MVP</span>
        </div>
        <div className="nav-actions">
          <button
            className={page === "messages" ? "" : "btn-secondary"}
            onClick={() => {
              setPage("messages");
              setErrorMsg("");
              loadConversations();
            }}
          >
            💬 Messages {conversations.length > 0 && <span style={{ fontSize: "11px", background: "#ef4444", color: "#fff", padding: "1px 6px", borderRadius: "10px", marginLeft: "4px" }}>{conversations.length}</span>}
          </button>

          {page === "home" ? (
            <button onClick={() => { setPage("new"); setErrorMsg(""); }}>
              + Create Swap
            </button>
          ) : (
            <button className="btn-secondary" onClick={() => setPage("home")}>
              ← Back to Feed
            </button>
          )}

          <div className="user-tag">
            👤 <b>{user.name}</b> ({user.batch})
          </div>
          <button className="btn-secondary" onClick={logout} style={{ padding: "8px 14px" }}>
            Logout
          </button>
        </div>
      </header>

      {/* CREATE POST PAGE WITH VIDEO AND DOCUMENT OPTIONS */}
      {page === "new" ? (
        <div style={{ maxWidth: "580px", margin: "0 auto" }}>
          <div className="box" style={{ maxWidth: "100%" }}>
            <h1>Create a SkillSwap</h1>
            <p className="subtitle">Offer a skill you excel at, request one to learn, & attach videos or learning docs</p>

            {errorMsg && <div className="alert-toast">{errorMsg}</div>}

            <form onSubmit={createPost}>
              <div className="form-group">
                <label>Skill You Can Teach</label>
                <input
                  name="teach_skill"
                  placeholder="e.g. React UI Design, Data Structures, Calculus"
                  onChange={change}
                  required
                />
              </div>

              <div className="form-group">
                <label>Skill You Want to Learn</label>
                <input
                  name="learn_skill"
                  placeholder="e.g. Python Async, Machine Learning, Figma"
                  onChange={change}
                  required
                />
              </div>

              <div className="form-group">
                <label>Swap Details & Expectations</label>
                <textarea
                  name="description"
                  placeholder="Describe your availability, learning goals, or preferred schedule..."
                  onChange={change}
                />
              </div>

              <div className="form-group">
                <label>📹 Related Skill Video Link / Embed URL (Optional)</label>
                <input
                  name="video_url"
                  placeholder="e.g. https://www.youtube.com/embed/w7ejDZ8SWv8 or video tutorial link"
                  onChange={change}
                />
              </div>

              <div className="form-group">
                <label>📄 Learning Document / Notes Link (Optional)</label>
                <input
                  name="document_url"
                  placeholder="e.g. https://react.dev/learn or Google Drive notes URL"
                  onChange={change}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <button className="btn-secondary" type="button" onClick={() => setPage("home")} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" style={{ flex: 2 }}>
                  Post SkillSwap
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : page === "messages" ? (
        /* MESSAGING DASHBOARD VIEW */
        <section>
          <div className="feed-header" style={{ marginBottom: "16px" }}>
            <h2>Direct Student Messaging</h2>
          </div>

          <div className="messaging-container">
            {/* Left Sidebar: Contact list */}
            <div className="contacts-sidebar">
              <div className="contacts-header">
                <h3>
                  <span>Students</span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "normal" }}>
                    {contactsList.length} total
                  </span>
                </h3>
                <div className="contacts-search">
                  <input
                    placeholder="🔍 Filter student contacts..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="contacts-list">
                {contactsList.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px", textAlign: "center" }}>
                    No students found.
                  </p>
                ) : (
                  contactsList.map((u) => {
                    const conv = conversations.find((c) => c.contact.id === u.id);
                    const isSelected = activeContact?.id === u.id;
                    return (
                      <div
                        key={u.id}
                        className={`contact-item ${isSelected ? "active" : ""}`}
                        onClick={() => openChatWithUser(u)}
                      >
                        <div className="contact-avatar">{u.name.charAt(0).toUpperCase()}</div>
                        <div className="contact-details">
                          <div className="contact-name-row">
                            <span className="contact-name">{u.name}</span>
                            {conv && conv.timestamp && (
                              <span className="contact-time">
                                {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="contact-preview">
                            {conv ? conv.latestMessage : `${u.batch} · ${u.student_id}`}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Main Panel: Active Chat Thread */}
            <div className="chat-panel">
              {activeContact ? (
                <>
                  <div className="chat-header">
                    <div className="chat-user-info">
                      <div className="contact-avatar">{activeContact.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <h3>{activeContact.name}</h3>
                        <div className="chat-user-sub">
                          Student ID: <b>{activeContact.student_id}</b> · Batch {activeContact.batch} · 📞 {activeContact.phone}
                        </div>
                      </div>
                    </div>
                    <button className="export-json-btn" onClick={exportRawJson} title="Download raw JSON chat data to local device">
                      📥 Export Raw JSON
                    </button>
                  </div>

                  <div className="messages-history">
                    {activeThread.length === 0 ? (
                      <div className="empty-chat">
                        <div className="empty-chat-icon">💬</div>
                        <p>No messages yet with {activeContact.name}.</p>
                        <p style={{ fontSize: "12px", marginTop: "4px" }}>
                          Send a message to start swapping skills!
                        </p>
                      </div>
                    ) : (
                      activeThread.map((m) => {
                        const isSent = m.sender_id === user.id;
                        return (
                          <div key={m.id} className={`message-bubble ${isSent ? "sent" : "received"}`}>
                            <div>{m.message}</div>
                            <div className="message-meta">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isSent && " ✓"}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  <form className="chat-composer" onSubmit={sendMessage}>
                    <input
                      placeholder={`Write a message to ${activeContact.name}...`}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                    />
                    <button type="submit">Send 🚀</button>
                  </form>
                </>
              ) : (
                <div className="empty-chat">
                  <div className="empty-chat-icon">🤝</div>
                  <h3>Select a particular student to message</h3>
                  <p style={{ fontSize: "13px", marginTop: "6px" }}>
                    Choose a student from the sidebar list or click <b>💬 Message</b> on any skill post in the feed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* MAIN FEED & CATEGORY VIEWS */
        <section>
          {/* SEARCH & CATEGORY CHIPS BAR */}
          <div className="search-bar">
            <div className="search-input-wrapper">
              <input
                placeholder={
                  searchCategory === "teach"
                    ? "🔍 Search skills people can teach..."
                    : searchCategory === "learn"
                    ? "🔍 Search skills people want to learn..."
                    : searchCategory === "students"
                    ? "🔍 Search student names, IDs, batches, or profiles..."
                    : "🔍 Search all skills, descriptions, or student details..."
                }
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  loadPosts(e.target.value, searchCategory);
                }}
              />
              {search && (
                <button
                  className="search-clear-btn"
                  onClick={() => {
                    setSearch("");
                    loadPosts("", searchCategory);
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="search-filter-chips">
              <span
                className={`filter-chip ${searchCategory === "all" ? "active" : ""}`}
                onClick={() => {
                  setSearchCategory("all");
                  loadPosts(search, "all");
                }}
              >
                All Fields
              </span>
              <span
                className={`filter-chip ${searchCategory === "teach" ? "active" : ""}`}
                onClick={() => {
                  setSearchCategory("teach");
                  loadPosts(search, "teach");
                }}
              >
                Can Teach
              </span>
              <span
                className={`filter-chip ${searchCategory === "learn" ? "active" : ""}`}
                onClick={() => {
                  setSearchCategory("learn");
                  loadPosts(search, "learn");
                }}
              >
                Wants to Learn
              </span>
              <span
                className={`filter-chip ${searchCategory === "students" ? "active" : ""}`}
                onClick={() => {
                  setSearchCategory("students");
                  loadPosts(search, "students");
                }}
              >
                Students Directory
              </span>
            </div>
          </div>

          {/* DYNAMIC CATEGORY BANNER */}
          {searchCategory === "teach" && (
            <div className="category-view-banner teach">
              <span>🎓 <b>Can Teach Feed:</b> Viewing skills students excel at and offer to teach</span>
              <span>{filteredPosts.length} Skills Available</span>
            </div>
          )}
          {searchCategory === "learn" && (
            <div className="category-view-banner learn">
              <span>📘 <b>Wants to Learn Feed:</b> Viewing skills students request to learn</span>
              <span>{filteredPosts.length} Requests Available</span>
            </div>
          )}
          {searchCategory === "students" && (
            <div className="category-view-banner students">
              <span>👨‍🎓 <b>Students Directory:</b> Browse student profiles, backgrounds, and contact info</span>
              <span>{filteredStudents.length} Students Registered</span>
            </div>
          )}

          <div className="feed-header">
            <h2>
              {searchCategory === "students"
                ? "Student Directory"
                : searchCategory === "teach"
                ? "Skills Available to Learn (Can Teach)"
                : searchCategory === "learn"
                ? "Skill Requests (Wants to Learn)"
                : "Available SkillSwaps"}
            </h2>
            <span className="post-count">
              {searchCategory === "students" ? `${filteredStudents.length} Students` : `${filteredPosts.length} Swaps`}
            </span>
          </div>

          {/* STUDENTS DIRECTORY VIEW MODE */}
          {searchCategory === "students" ? (
            filteredStudents.length === 0 ? (
              <div className="box" style={{ textAlign: "center", maxWidth: "100%", padding: "40px" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>No students found matching your search.</p>
              </div>
            ) : (
              <div className="students-grid">
                {filteredStudents.map((st) => {
                  const isSelf = st.id === user.id;
                  return (
                    <div className="student-card" key={st.id}>
                      <div>
                        <div className="student-card-header">
                          <div className="student-avatar-large">{st.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <h3 style={{ fontSize: "18px" }}>
                              {st.name} {isSelf && <span style={{ fontSize: "11px", background: "rgba(99,102,241,0.2)", color: "#a5b4fc", padding: "2px 6px", borderRadius: "10px" }}>You</span>}
                            </h3>
                            <div className="student-meta">
                              ID: <b>{st.student_id}</b> · Batch <b>{st.batch}</b>
                            </div>
                          </div>
                        </div>

                        {st.description && (
                          <div className="profile-desc" style={{ marginBottom: "14px" }}>
                            "{st.description}"
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                        {!isSelf && (
                          <button
                            className="w-full"
                            onClick={() => openChatWithUser(st)}
                            style={{ fontSize: "13px", padding: "8px 12px" }}
                          >
                            💬 Message
                          </button>
                        )}
                        <button
                          className="w-full btn-secondary"
                          onClick={() => setConnectModal({ name: st.name, student_id: st.student_id, batch: st.batch, phone: st.phone, user_id: st.id })}
                          style={{ fontSize: "13px", padding: "8px 12px" }}
                        >
                          📞 Phone
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* POST CARDS FEED MODE */
            filteredPosts.length === 0 ? (
              <div className="box" style={{ textAlign: "center", maxWidth: "100%", padding: "40px" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>
                  No skill swaps found matching "<b>{searchCategory}</b>" {search && <>and query "<b>{search}</b>"</>}.
                </p>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSearch("");
                    setSearchCategory("all");
                    loadPosts("", "all");
                  }}
                  style={{ marginTop: "12px" }}
                >
                  Reset Search & Filters
                </button>
              </div>
            ) : (
              <div className="posts-grid">
                {filteredPosts.map((p) => {
                  const isSelf = p.user_id === user.id;
                  return (
                    <article
                      className="post-card"
                      key={p.id}
                      onClick={() => setSelectedPostDetail(p)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="card-top">
                        <div className="student-info">
                          <h3>
                            {p.name}{" "}
                            {isSelf && (
                              <span style={{ fontSize: "11px", background: "rgba(99,102,241,0.2)", color: "#a5b4fc", padding: "2px 6px", borderRadius: "10px" }}>
                                You
                              </span>
                            )}
                          </h3>
                          <div className="student-meta">
                            ID: <b>{p.student_id}</b> · Batch: <b>{p.batch}</b>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                          {!isSelf && (
                            <button
                              onClick={() => openChatWithUser({ id: p.user_id, name: p.name, student_id: p.student_id, batch: p.batch, phone: p.phone })}
                              style={{
                                padding: "8px 14px",
                                fontSize: "13px",
                                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)"
                              }}
                            >
                              💬 Message
                            </button>
                          )}
                          <button
                            onClick={() => setConnectModal(p)}
                            style={{
                              padding: "8px 14px",
                              fontSize: "13px",
                              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
                            }}
                          >
                            📞 Connect
                          </button>
                        </div>
                      </div>

                      <div className="skills-container">
                        <div className={`skill-pill teach ${searchCategory === "teach" ? "active-pill" : ""}`}>
                          <div className="skill-label">Can Teach</div>
                          <div className="skill-name">{p.teach_skill}</div>
                        </div>
                        <div className={`skill-pill learn ${searchCategory === "learn" ? "active-pill" : ""}`}>
                          <div className="skill-label">Wants to Learn</div>
                          <div className="skill-name">{p.learn_skill}</div>
                        </div>
                      </div>

                      {p.description && (
                        <div className="post-desc">
                          <b>Swap Note:</b> {p.description}
                        </div>
                      )}

                      {/* EXPLICIT ACTION BAR ON CARD (VIDEO, DOCS, DETAILS) */}
                      <div className="card-action-bar" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="card-action-btn btn-video"
                          onClick={() => setSelectedPostDetail(p)}
                          title="Open front window to watch video tutorial"
                        >
                          🎬 Watch Video
                        </button>

                        <button
                          className="card-action-btn btn-doc"
                          onClick={() => setSelectedPostDetail(p)}
                          title="Open front window to view learning docs"
                        >
                          📄 View Docs
                        </button>

                        <button
                          className="card-action-btn btn-details"
                          onClick={() => setSelectedPostDetail(p)}
                          title="Open full front detail window"
                        >
                          🔍 Details
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          )}
        </section>
      )}

      {/* POST DETAIL WINDOW / FRONT MODAL (Video & Document Viewing) */}
      {selectedPostDetail && (
        <div className="modal-overlay" onClick={() => setSelectedPostDetail(null)}>
          <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div>
                <div style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "bold", textTransform: "uppercase" }}>
                  SkillSwap Front Detail Window
                </div>
                <h2 style={{ fontSize: "24px", color: "var(--text-main)", marginTop: "2px" }}>
                  {selectedPostDetail.name}'s Skill Exchange
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Student ID: <b>{selectedPostDetail.student_id}</b> · Batch <b>{selectedPostDetail.batch}</b> · 📞 {selectedPostDetail.phone}
                </p>
              </div>
              <button className="detail-modal-close" onClick={() => setSelectedPostDetail(null)}>
                ✕
              </button>
            </div>

            <div className="skills-container" style={{ marginBottom: "18px" }}>
              <div className="skill-pill teach">
                <div className="skill-label">Teaching Skill</div>
                <div className="skill-name" style={{ fontSize: "17px" }}>{selectedPostDetail.teach_skill}</div>
              </div>
              <div className="skill-pill learn">
                <div className="skill-label">Learning Skill</div>
                <div className="skill-name" style={{ fontSize: "17px" }}>{selectedPostDetail.learn_skill}</div>
              </div>
            </div>

            {selectedPostDetail.description && (
              <div className="post-desc" style={{ fontSize: "15px", background: "rgba(255,255,255,0.04)", padding: "14px", borderRadius: "12px" }}>
                <b>Swap Expectations:</b> {selectedPostDetail.description}
              </div>
            )}

            {/* VIDEO OPTIONS SECTION */}
            <div style={{ marginTop: "20px" }}>
              <h4 style={{ fontSize: "16px", color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                🎬 Related Skill Video Tutorials & Demo
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" }}>
                Video lessons and interactive demonstrations for <b>{selectedPostDetail.teach_skill}</b>:
              </p>

              {selectedPostDetail.video_url ? (
                <div>
                  {selectedPostDetail.video_url.includes("youtube.com") || selectedPostDetail.video_url.includes("youtu.be") ? (
                    <div className="video-player-wrapper">
                      <iframe
                        src={selectedPostDetail.video_url}
                        title={`Video for ${selectedPostDetail.teach_skill}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="document-resource-box" style={{ borderColor: "rgba(239, 68, 68, 0.4)" }}>
                      <div className="document-resource-info">
                        <div className="document-icon" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5" }}>▶</div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600" }}>Skill Tutorial Video</div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{selectedPostDetail.video_url}</div>
                        </div>
                      </div>
                      <a href={selectedPostDetail.video_url} target="_blank" rel="noreferrer">
                        <button style={{ padding: "6px 14px", fontSize: "12px" }}>Watch Video 🎬</button>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="document-resource-box">
                  <div className="document-resource-info">
                    <div className="document-icon">🎬</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600" }}>YouTube Skill Tutorial</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Search online video guide for {selectedPostDetail.teach_skill}</div>
                    </div>
                  </div>
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedPostDetail.teach_skill + " tutorial")}`} target="_blank" rel="noreferrer">
                    <button style={{ padding: "6px 14px", fontSize: "12px" }}>Search Videos 🔍</button>
                  </a>
                </div>
              )}
            </div>

            {/* DOCUMENTS & RESOURCES SECTION */}
            <div style={{ marginTop: "20px" }}>
              <h4 style={{ fontSize: "16px", color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                📄 Learning Documents, Notes & Cheat Sheets
              </h4>

              {selectedPostDetail.document_url ? (
                <div className="document-resource-box">
                  <div className="document-resource-info">
                    <div className="document-icon">📘</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600" }}>Official Skill Documentation & Notes</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{selectedPostDetail.document_url}</div>
                    </div>
                  </div>
                  <a href={selectedPostDetail.document_url} target="_blank" rel="noreferrer">
                    <button style={{ padding: "8px 16px", fontSize: "13px" }}>Open Document 📄</button>
                  </a>
                </div>
              ) : (
                <div className="document-resource-box">
                  <div className="document-resource-info">
                    <div className="document-icon">📚</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600" }}>Skill Study Material</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Search reference notes for {selectedPostDetail.teach_skill}</div>
                    </div>
                  </div>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(selectedPostDetail.teach_skill + " documentation cheat sheet pdf")}`} target="_blank" rel="noreferrer">
                    <button style={{ padding: "8px 16px", fontSize: "13px" }}>Find Docs 🔍</button>
                  </a>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button className="btn-secondary" onClick={() => setSelectedPostDetail(null)} style={{ flex: 1 }}>
                Close Window
              </button>

              {selectedPostDetail.user_id !== user.id && (
                <button
                  style={{ flex: 1 }}
                  onClick={() => {
                    const target = { id: selectedPostDetail.user_id, name: selectedPostDetail.name, student_id: selectedPostDetail.student_id, batch: selectedPostDetail.batch, phone: selectedPostDetail.phone };
                    setSelectedPostDetail(null);
                    openChatWithUser(target);
                  }}
                >
                  💬 Message {selectedPostDetail.name}
                </button>
              )}

              <button
                style={{ flex: 1, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                onClick={() => {
                  const target = selectedPostDetail;
                  setSelectedPostDetail(null);
                  setConnectModal(target);
                }}
              >
                📞 Connect Phone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONNECT PHONE MODAL */}
      {connectModal && (
        <div className="modal-overlay" onClick={() => setConnectModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">📞</div>
            <h3>Connect with {connectModal.name}</h3>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
              Student ID: {connectModal.student_id} · Batch {connectModal.batch}
            </p>

            <div className="phone-box" onClick={() => copyPhone(connectModal.phone)}>
              {connectModal.phone}
            </div>
            <p style={{ fontSize: "12px", color: copied ? "#34d399" : "var(--text-muted)", marginBottom: "20px" }}>
              {copied ? "✓ Copied to clipboard!" : "Click phone number to copy"}
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn-secondary"
                onClick={() => setConnectModal(null)}
                style={{ flex: 1 }}
              >
                Close
              </button>
              {connectModal.user_id !== user.id && (
                <button
                  style={{ flex: 1 }}
                  onClick={() => {
                    const target = { id: connectModal.user_id, name: connectModal.name, student_id: connectModal.student_id, batch: connectModal.batch, phone: connectModal.phone };
                    setConnectModal(null);
                    openChatWithUser(target);
                  }}
                >
                  💬 Chat
                </button>
              )}
              <a
                href={`tel:${connectModal.phone}`}
                style={{ flex: 1, textDecoration: "none" }}
              >
                <button className="w-full">Call Now</button>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);