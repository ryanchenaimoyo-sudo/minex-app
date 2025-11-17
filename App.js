// App.js - Full local demo with Comments, Bookmarks, Follow, Search, Stories, Groups, Minerals, Notifications
// Safe Snack version: no extra dependencies, runs in Snack/Expo Go and web
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
} from "react-native";

const GOLD = "#c89b2a";
const BG = "#070707";
const PANEL = "#0f0f10";
const MUTED = "#9aa";
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1558980664-10b0b2f8d3c8?w=1200&q=60&auto=format&fit=crop&s=placeholder";

function Button({ onPress, children, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, style]}>
      <Text style={{ fontWeight: "700" }}>{children}</Text>
    </TouchableOpacity>
  );
}

/* ---------------- seed data ---------------- */
const seedUsers = [
  {
    id: "u1",
    email: "ryan@example.com",
    name: "Ryan Finch",
    role: "dealer",
    verified: true,
    suspended: false,
    following: ["u2"],
    bookmarks: [],
    stories: [
      { id: "s1", image: PLACEHOLDER, title: "Site visit" },
      { id: "s2", image: PLACEHOLDER, title: "Samples" },
    ],
  },
  {
    id: "u2",
    email: "mina@example.com",
    name: "Mina",
    role: "miner",
    verified: false,
    suspended: false,
    following: [],
    bookmarks: [],
    stories: [{ id: "s3", image: PLACEHOLDER, title: "Pit" }],
  },
];

const seedPosts = [
  {
    id: "p1",
    authorId: "u1",
    title: "Chrome concentrate — 50t",
    body: "Fresh Chrome concentrate available in Johannesburg. Contact for pricing.",
    image: PLACEHOLDER,
    likes: 3,
    createdAt: new Date().toISOString(),
    comments: [{ id: "c1", authorId: "u2", body: "What's the grade?", createdAt: new Date().toISOString() }],
    groupId: null,
    minerals: [{ id: "m1", name: "Chrome", grade: "45% Cr2O3", tonnage: 50 }],
  },
];

const seedGroups = [
  { id: "g1", name: "Johannesburg Traders", description: "Local market", members: ["u1", "u2"] },
];

const seedMinerals = [
  { id: "m1", sellerId: "u1", name: "Chrome Concentrate", grade: "45% Cr2O3", tonnage: 50, pricePerTon: 200 },
];

/* ---------------- App ---------------- */
export default function App() {
  const [route, setRoute] = useState("home"); // home,signup,login,feed,create,profile,chat,admin,settings,groups,minerals
  const [users, setUsers] = useState(seedUsers);
  const [posts, setPosts] = useState(seedPosts);
  const [chats, setChats] = useState([]); // {id,userA,userB,messages:[]}
  const [groups, setGroups] = useState(seedGroups);
  const [minerals, setMinerals] = useState(seedMinerals);
  const [notifications, setNotifications] = useState([]); // {id,userId,title,body,read}
  const [currentUser, setCurrentUser] = useState(null); // user object
  const [storyModal, setStoryModal] = useState({ show: false, user: null, index: 0 });
  const [searchQuery, setSearchQuery] = useState("");

  const makeId = (p = "") => p + Math.random().toString(36).substring(2, 9);

  /* ---------- AUTH (local) ---------- */
  function signupLocal({ name, email, password, role }) {
    if (!email || !password) return Alert.alert("Enter email and password");
    if (users.find((u) => u.email === email)) return Alert.alert("Email already used");
    const u = {
      id: makeId("u"),
      email,
      name: name || email.split("@")[0],
      role: role || "buyer",
      verified: false,
      suspended: false,
      following: [],
      bookmarks: [],
      stories: [],
    };
    setUsers((s) => [u, ...s]);
    Alert.alert("Signed up (demo). Please sign in.");
    setRoute("login");
  }

  function loginLocal({ email, password }) {
    const u = users.find((x) => x.email === email);
    if (!u) return Alert.alert("User not found (demo)");
    if (u.suspended) return Alert.alert("Account suspended (demo)");
    setCurrentUser(u);
    notifyLocal(u.id, "Welcome", `Welcome back, ${u.name}`);
    setRoute("feed");
  }

  function logout() {
    setCurrentUser(null);
    setRoute("home");
  }

  /* ---------- POSTS, COMMENTS, LIKES, BOOKMARKS ---------- */
  function createLocalPost({ title, body, image, groupId, mineralsList }) {
    if (!currentUser) return Alert.alert("Sign in to post");
    const post = {
      id: makeId("p"),
      authorId: currentUser.id,
      title,
      body,
      image: image || PLACEHOLDER,
      likes: 0,
      createdAt: new Date().toISOString(),
      comments: [],
      groupId: groupId || null,
      minerals: mineralsList || [],
    };
    setPosts((p) => [post, ...p]);
    notifyFollowersOnPost(post);
    setRoute("feed");
  }

  function notifyFollowersOnPost(post) {
    const author = users.find((u) => u.id === post.authorId);
    if (!author) return;
    (author.following || []).forEach((fId) => {
      // follower notification: in demo we send to all who follow author? reverse: followers are users who follow author => users where following includes author.id
    });
    // send to all followers (users where following includes author.id)
    const followers = users.filter((u) => (u.following || []).includes(author.id));
    followers.forEach((f) => notifyLocal(f.id, "New post", `${author.name} posted: ${post.title}`));
  }

  function likePost(postId) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p)));
  }

  function addComment(postId, text) {
    if (!currentUser) return Alert.alert("Sign in to comment");
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: [{ id: makeId("c"), authorId: currentUser.id, body: text, createdAt: new Date().toISOString() }, ...(p.comments || [])] }
          : p
      )
    );
    notifyLocal(posts.find((x) => x.id === postId)?.authorId, "New comment", `${currentUser.name} commented on your post`);
  }

  function toggleBookmark(postId) {
    if (!currentUser) return Alert.alert("Sign in to bookmark");
    // update user bookmarks
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== currentUser.id) return u;
        const has = (u.bookmarks || []).includes(postId);
        const next = has ? (u.bookmarks || []).filter((x) => x !== postId) : [postId, ...(u.bookmarks || [])];
        return { ...u, bookmarks: next };
      })
    );
    // update currentUser reference
    setCurrentUser((u) => {
      if (!u) return u;
      const has = (u.bookmarks || []).includes(postId);
      const next = has ? (u.bookmarks || []).filter((x) => x !== postId) : [postId, ...(u.bookmarks || [])];
      return { ...u, bookmarks: next };
    });
  }

  /* ---------- FOLLOW ---------- */
  function toggleFollow(targetUserId) {
    if (!currentUser) return Alert.alert("Sign in to follow");
    // if currentUser already follows target, unfollow, else follow
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== currentUser.id) return u;
        const follows = u.following || [];
        const has = follows.includes(targetUserId);
        return { ...u, following: has ? follows.filter((f) => f !== targetUserId) : [targetUserId, ...follows] };
      })
    );
    // update currentUser
    setCurrentUser((u) => {
      if (!u) return u;
      const has = (u.following || []).includes(targetUserId);
      return { ...u, following: has ? (u.following || []).filter((f) => f !== targetUserId) : [targetUserId, ...(u.following || [])] };
    });
  }

  /* ---------- CHAT (local) ---------- */
  function openOrCreateChat(withUserId) {
    if (!currentUser) return Alert.alert("Sign in to chat");
    if (withUserId === currentUser.id) return Alert.alert("Can't chat with yourself");
    let chat = chats.find((c) => (c.userA === currentUser.id && c.userB === withUserId) || (c.userB === currentUser.id && c.userA === withUserId));
    if (!chat) {
      chat = { id: makeId("c"), userA: currentUser.id, userB: withUserId, messages: [] };
      setChats((s) => [chat, ...s]);
    }
    setRoute("chat");
    setActiveChat(chat.id);
  }

  function sendMessage(chatId, text) {
    if (!currentUser) return Alert.alert("Sign in to message");
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, messages: [{ senderId: currentUser.id, body: text, createdAt: new Date().toISOString() }, ...(c.messages || [])] } : c)));
  }

  /* ---------- GROUPS ---------- */
  function createGroup({ name, description }) {
    const g = { id: makeId("g"), name, description, members: [currentUser?.id || ""] };
    setGroups((s) => [g, ...s]);
    setRoute("groups");
  }

  function joinGroup(groupId) {
    if (!currentUser) return Alert.alert("Sign in to join group");
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: g.members.includes(currentUser.id) ? g.members : [currentUser.id, ...g.members] } : g)));
  }

  /* ---------- MINERALS ---------- */
  function listMineral({ name, grade, tonnage, pricePerTon }) {
    if (!currentUser) return Alert.alert("Sign in to list minerals");
    const m = { id: makeId("m"), sellerId: currentUser.id, name, grade, tonnage: Number(tonnage), pricePerTon: Number(pricePerTon) };
    setMinerals((s) => [m, ...s]);
    setRoute("minerals");
  }

  /* ---------- STORIES ---------- */
  function openStories(user) {
    setStoryModal({ show: true, user, index: 0 });
  }
  function nextStory() {
    setStoryModal((s) => ({ ...s, index: s.index + 1 }));
  }
  function closeStories() {
    setStoryModal({ show: false, user: null, index: 0 });
  }

  /* ---------- SEARCH ---------- */
  function searchAll(q) {
    setSearchQuery(q);
    // Filtering handled in render when showing lists
  }

  /* ---------- NOTIFICATIONS (local) ---------- */
  function notifyLocal(userId, title, body) {
    if (!userId) return;
    const note = { id: makeId("n"), userId, title, body, read: false, createdAt: new Date().toISOString() };
    setNotifications((s) => [note, ...s]);
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  /* ---------- UI screens ---------- */

  const [activeChat, setActiveChat] = useState(null);

  function Header({ title, miniRight, onRight }) {
    return (
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ color: GOLD, fontSize: 20, fontWeight: "800" }}>{title}</Text>
        <TouchableOpacity onPress={onRight}><Text style={{ color: GOLD }}>{miniRight}</Text></TouchableOpacity>
      </View>
    );
  }

  function Home() {
    return (
      <ScrollView style={{ padding: 16 }}>
        <Header title="MineX" miniRight={currentUser ? "Account" : "Sign in"} onRight={() => (currentUser ? setRoute("profile") : setRoute("login"))} />
        <View style={styles.card}>
          <Text style={styles.h2}>Welcome to MineX (demo)</Text>
          <Text style={{ color: MUTED, marginTop: 8 }}>Test everything locally. Later we wire Supabase.</Text>
          <View style={{ marginTop: 12 }}>
            <Button onPress={() => setRoute("signup")}>Create account</Button>
            <Button onPress={() => setRoute("feed")} style={{ marginTop: 8 }}>Open Feed</Button>
            <Button onPress={() => setRoute("groups")} style={{ marginTop: 8 }}>Groups</Button>
            <Button onPress={() => setRoute("minerals")} style={{ marginTop: 8 }}>Minerals</Button>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={{ color: MUTED }}>Demo accounts</Text>
          {users.map((u) => (
            <View key={u.id} style={{ marginTop: 8, padding: 8, background: "#090909", borderRadius: 6 }}>
              <Text style={{ fontWeight: "700" }}>{u.name} ({u.role})</Text>
              <Text style={{ color: MUTED }}>{u.email}</Text>
              <View style={{ flexDirection: "row", marginTop: 8 }}>
                <Button onPress={() => loginLocal({ email: u.email, password: "demo" })} style={{ marginRight: 8 }}>Login as {u.name}</Button>
                <Button onPress={() => openOrCreateChat(u.id)}>Chat</Button>
                <Button onPress={() => openStories(u)} style={{ marginLeft: 8 }}>Stories</Button>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [role, setRole] = useState("dealer");
    return (
      <ScrollView style={{ padding: 16 }}>
        <Header title="Sign up" />
        <View style={styles.card}>
          <TextInput placeholder="Full name" placeholderTextColor={MUTED} style={styles.input} value={name} onChangeText={setName} />
          <TextInput placeholder="Email" placeholderTextColor={MUTED} style={styles.input} value={email} onChangeText={setEmail} />
          <TextInput placeholder="Password" placeholderTextColor={MUTED} style={styles.input} secureTextEntry value={pw} onChangeText={setPw} />
          <TextInput placeholder="Role (miner/dealer/buyer)" placeholderTextColor={MUTED} style={styles.input} value={role} onChangeText={setRole} />
          <Button onPress={() => signupLocal({ name, email, password: pw, role })}>Sign up</Button>
        </View>
      </ScrollView>
    );
  }

  function Login() {
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    return (
      <View style={{ padding: 16 }}>
        <Header title="Sign in" />
        <View style={styles.card}>
          <TextInput placeholder="Email" placeholderTextColor={MUTED} style={styles.input} value={email} onChangeText={setEmail} />
          <TextInput placeholder="Password" placeholderTextColor={MUTED} style={styles.input} secureTextEntry value={pw} onChangeText={setPw} />
          <Button onPress={() => loginLocal({ email, password: pw })}>Sign in</Button>
        </View>
      </View>
    );
  }

  function Feed() {
    // filter by search query
    const q = searchQuery.trim().toLowerCase();
    const filteredPosts = q
      ? posts.filter((p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q) || (p.minerals || []).some((m) => m.name.toLowerCase().includes(q)))
      : posts;
    return (
      <View style={{ padding: 16, flex: 1 }}>
        <Header title="Feed" miniRight={currentUser ? "Create" : "Sign in"} onRight={() => (currentUser ? setRoute("create") : setRoute("login"))} />
        <TextInput placeholder="Search posts, minerals, authors..." placeholderTextColor={MUTED} style={styles.input} value={searchQuery} onChangeText={searchAll} />
        <ScrollView>
          {filteredPosts.length === 0 && <Text style={{ color: MUTED, marginTop: 12 }}>No posts found</Text>}
          {filteredPosts.map((p) => {
            const author = users.find((u) => u.id === p.authorId) || { name: "Unknown" };
            return (
              <View key={p.id} style={styles.post}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ fontWeight: "800" }}>{p.title}</Text>
                    <Text style={{ color: MUTED, fontSize: 12 }}>{author.name}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button onPress={() => toggleBookmark(p.id)} style={{ paddingHorizontal: 8 }}>{(currentUser && currentUser.bookmarks && currentUser.bookmarks.includes(p.id)) ? "Saved" : "Save"}</Button>
                    {currentUser && currentUser.id === p.authorId && <Button onPress={() => setPosts((pr) => pr.filter((x) => x.id !== p.id))} style={{ backgroundColor: "#b33" }}>Delete</Button>}
                  </View>
                </View>

                <Text style={{ marginTop: 8 }}>{p.body}</Text>
                {p.image && <Image source={{ uri: p.image }} style={{ width: "100%", height: 150, marginTop: 8, borderRadius: 8 }} />}
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: MUTED }}>Minerals:</Text>
                  {(p.minerals || []).map((m) => <Text key={m.id} style={{ color: MUTED }}>{m.name} — {m.grade} — {m.tonnage}t</Text>)}
                </View>

                <View style={{ flexDirection: "row", marginTop: 10, alignItems: "center" }}>
                  <Button onPress={() => likePost(p.id)} style={{ paddingHorizontal: 10 }}>Like</Button>
                  <Text style={{ color: MUTED, marginLeft: 10 }}>{p.likes} likes</Text>
                  <Button onPress={() => { const txt = promptLocal("Write comment"); if (txt) addComment(p.id, txt); }} style={{ marginLeft: 8 }}>Comment</Button>
                  <Button onPress={() => openOrCreateChat(p.authorId)} style={{ marginLeft: 8 }}>Message</Button>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontWeight: "700" }}>Comments</Text>
                  {(p.comments || []).map((c) => {
                    const ca = users.find((u) => u.id === c.authorId) || { name: "Unknown" };
                    return (
                      <View key={c.id} style={{ marginTop: 6, padding: 8, backgroundColor: "#080808", borderRadius: 6 }}>
                        <Text style={{ fontWeight: "700" }}>{ca.name}</Text>
                        <Text style={{ color: MUTED }}>{c.body}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // small prompt replacement for Snack (no browser prompt)
  function promptLocal(title) {
    // Snack can't show synchronous prompt, so use simple modal-like flow via Alert with input not possible.
    // We emulate by asking user to open "Create comment" screen; for simplicity here we return a test string.
    // To keep flow working, show Alert and return null.
    Alert.alert(title, "Type comment in UI is not supported in Snack prompt. Use fixed demo comment.", [{ text: "OK" }]);
    return "Nice post (demo comment)";
  }

  function CreatePost() {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [mineralsInput, setMineralsInput] = useState(""); // simple CSV: name|grade|tonnage
    function submit() {
      if (!title || !body) return Alert.alert("Add title and body");
      const mineralsList = mineralsInput
        ? mineralsInput.split(";").map((s) => {
            const parts = s.split("|").map((x) => x.trim());
            return { id: makeId("m"), name: parts[0] || "Mineral", grade: parts[1] || "", tonnage: Number(parts[2] || 0) };
          })
        : [];
      createLocalPost({ title, body, image: imageUrl || PLACEHOLDER, groupId: selectedGroup, mineralsList });
    }
    return (
      <ScrollView style={{ padding: 16 }}>
        <Header title="Create Post" />
        <View style={styles.card}>
          <TextInput placeholder="Title" placeholderTextColor={MUTED} style={styles.input} value={title} onChangeText={setTitle} />
          <TextInput placeholder="Write details..." placeholderTextColor={MUTED} style={[styles.input, { height: 120 }]} value={body} onChangeText={setBody} multiline />
          <TextInput placeholder="Image URL (optional)" placeholderTextColor={MUTED} style={styles.input} value={imageUrl} onChangeText={setImageUrl} />
          <TextInput placeholder="Minerals (name|grade|tonnage; ...)" placeholderTextColor={MUTED} style={styles.input} value={mineralsInput} onChangeText={setMineralsInput} />
          <Text style={{ color: MUTED }}>Group (optional)</Text>
          <ScrollView horizontal style={{ marginTop: 8 }}>
            {groups.map((g) => (
              <TouchableOpacity key={g.id} onPress={() => setSelectedGroup(g.id)} style={{ padding: 8, marginRight: 8, backgroundColor: selectedGroup === g.id ? GOLD : "#111", borderRadius: 6 }}>
                <Text style={{ color: selectedGroup === g.id ? "#000" : "#fff" }}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ marginTop: 12 }}>
            <Button onPress={submit}>Post</Button>
          </View>
        </View>
      </ScrollView>
    );
  }

  function Profile({ routeUserId }) {
    const uid = routeUserId || currentUser?.id;
    const profile = users.find((u) => u.id === uid);
    if (!profile) return <View style={{ padding: 16 }}><Text style={{ color: MUTED }}>Profile not found</Text></View>;
    const postsBy = posts.filter((p) => p.authorId === profile.id);
    const isFollowing = currentUser && (currentUser.following || []).includes(profile.id);
    return (
      <ScrollView style={{ padding: 16 }}>
        <Header title={`${profile.name}'s profile`} miniRight={currentUser && currentUser.id !== profile.id ? (isFollowing ? "Following" : "Follow") : ""} onRight={() => currentUser && currentUser.id !== profile.id ? toggleFollow(profile.id) : null} />
        <View style={styles.card}>
          <Text style={{ fontWeight: "800" }}>{profile.name}</Text>
          <Text style={{ color: MUTED }}>{profile.email}</Text>
          <Text style={{ marginTop: 8 }}>Role: {profile.role}</Text>
          <Text>Verified: {profile.verified ? "Yes" : "No"}</Text>
        </View>

        <View style={styles.card}>
          <Text style={{ fontWeight: "800" }}>Posts</Text>
          {postsBy.length === 0 && <Text style={{ color: MUTED }}>No posts yet</Text>}
          {postsBy.map((p) => (
            <View key={p.id} style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: "700" }}>{p.title}</Text>
              <Text style={{ color: MUTED }}>{p.body}</Text>
            </View>
          ))}
        </View>

        {currentUser && currentUser.id === profile.id && (
          <View style={styles.card}>
            <Button onPress={() => setRoute("create")}>Create a post</Button>
            <Button onPress={logout} style={{ marginTop: 8 }}>Sign out</Button>
            <Button onPress={() => setRoute("settings")} style={{ marginTop: 8 }}>Settings</Button>
          </View>
        )}
      </ScrollView>
    );
  }

  function Chat() {
    const [text, setText] = useState("");
    const chat = chats.find((c) => c.id === activeChat);
    function send() {
      if (!chat) return Alert.alert("Open a chat");
      if (!text) return;
      sendMessage(chat.id, text);
      setText("");
    }
    return (
      <View style={{ padding: 16, flex: 1 }}>
        <Header title="Chat" />
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: 200 }}>
            <Text style={{ color: MUTED }}>Your chats</Text>
            <ScrollView style={{ marginTop: 8 }}>
              {chats.filter((c) => c.userA === currentUser?.id || c.userB === currentUser?.id).map((c) => {
                const otherId = c.userA === currentUser?.id ? c.userB : c.userA;
                const other = users.find((u) => u.id === otherId);
                return (
                  <TouchableOpacity key={c.id} onPress={() => { setActiveChat(c.id); setRoute("chat"); }}>
                    <View style={{ padding: 8, borderColor: "#222", borderWidth: 1, marginBottom: 6 }}>
                      <Text>{other?.name || otherId}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ flex: 1, paddingLeft: 12 }}>
            {chat ? (
              <>
                <ScrollView style={{ height: 320, backgroundColor: "#080808", padding: 8, borderRadius: 8 }}>
                  {chat.messages.map((m, i) => (
                    <View key={i} style={{ marginBottom: 8 }}>
                      <Text style={{ fontWeight: "700" }}>{users.find((u) => u.id === m.senderId)?.name || m.senderId}</Text>
                      <Text style={{ color: MUTED }}>{m.body}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: "row", marginTop: 8 }}>
                  <TextInput placeholder="Message..." placeholderTextColor={MUTED} style={[styles.input, { flex: 1 }]} value={text} onChangeText={setText} />
                  <Button onPress={send} style={{ marginLeft: 8 }}>Send</Button>
                </View>
              </>
            ) : <Text style={{ color: MUTED }}>Open a chat from left column or start from a profile.</Text>}
          </View>
        </View>
      </View>
    );
  }

  function AdminPanel() {
    return (
      <ScrollView style={{ padding: 16 }}>
        <Header title="Admin Panel" />
        <View style={styles.card}>
          <Text style={{ color: MUTED }}>Verify or suspend demo users</Text>
          {users.map((u) => (
            <View key={u.id} style={{ padding: 8, borderColor: "#222", borderWidth: 1, marginTop: 8 }}>
              <Text style={{ fontWeight: "700" }}>{u.name} ({u.email})</Text>
              <Text style={{ color: MUTED }}>Role: {u.role} | Verified: {u.verified ? "Yes" : "No"}</Text>
              <View style={{ flexDirection: "row", marginTop: 8 }}>
                <Button onPress={() => adminVerify(u.id)}>Verify</Button>
                <Button onPress={() => adminSuspend(u.id)} style={{ marginLeft: 8 }}>Suspend</Button>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={{ fontWeight: "800" }}>Notifications</Text>
          <Button onPress={() => markAllRead()}>Mark all read</Button>
          {notifications.filter((n) => n.userId === currentUser?.id).map((n) => (
            <View key={n.id} style={{ marginTop: 8, padding: 8, backgroundColor: n.read ? "#0a0a0a" : "#111" }}>
              <Text style={{ fontWeight: "700" }}>{n.title}</Text>
              <Text style={{ color: MUTED }}>{n.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  function GroupsScreen() {
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    return (
      <ScrollView style={{ padding: 16 }}>
        <Header title="Groups" />
        <View style={styles.card}>
          <TextInput placeholder="Group name" placeholderTextColor={MUTED} style={styles.input} value={name} onChangeText={setName} />
          <TextInput placeholder="Description" placeholderTextColor={MUTED} style={styles.input} value={desc} onChangeText={setDesc} />
          <Button onPress={() => { if (!name) return Alert.alert("Add name"); createGroup({ name, description: desc }); }}>Create group</Button>
        </View>

        <View style={styles.card}>
          {groups.map((g) => (
            <View key={g.id} style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: "800" }}>{g.name}</Text>
              <Text style={{ color: MUTED }}>{g.description}</Text>
              <Text style={{ color: MUTED }}>Members: {g.members.length}</Text>
              <View style={{ flexDirection: "row", marginTop: 8 }}>
                <Button onPress={() => joinGroup(g.id)}>Join</Button>
                <Button onPress={() => setRoute("feed")} style={{ marginLeft: 8 }}>View feed</Button>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  function MineralsScreen() {
    const [name, setName] = useState("");
    const [grade, setGrade] = useState("");
    const [tonnage, setTonnage] = useState("");
    const [price, setPrice] = useState("");
    return (
      <ScrollView style={{ padding: 16 }}>
        <Header title="Mineral Listings" />
        <View style={styles.card}>
          <TextInput placeholder="Name" placeholderTextColor={MUTED} style={styles.input} value={name} onChangeText={setName} />
          <TextInput placeholder="Grade" placeholderTextColor={MUTED} style={styles.input} value={grade} onChangeText={setGrade} />
          <TextInput placeholder="Tonnage" placeholderTextColor={MUTED} style={styles.input} value={tonnage} onChangeText={setTonnage} keyboardType="numeric" />
          <TextInput placeholder="Price per ton" placeholderTextColor={MUTED} style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
          <Button onPress={() => { if (!name) return Alert.alert("Add name"); listMineral({ name, grade, tonnage, pricePerTon: price }); }}>List mineral</Button>
        </View>

        <View style={styles.card}>
          <Text style={{ fontWeight: "800" }}>Market</Text>
          {minerals.map((m) => {
            const seller = users.find((u) => u.id === m.sellerId) || { name: "Unknown" };
            return (
              <View key={m.id} style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: "800" }}>{m.name} — {m.grade}</Text>
                <Text style={{ color: MUTED }}>{m.tonnage} t • ${m.pricePerTon} / t — Seller: {seller.name}</Text>
                <View style={{ flexDirection: "row", marginTop: 8 }}>
                  <Button onPress={() => openOrCreateChat(m.sellerId)}>Contact seller</Button>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  function Settings() {
    return (
      <ScrollView style={{ padding: 16 }}>
        <Header title="Settings" />
        <View style={styles.card}>
          <Text style={{ color: MUTED }}>This demo is local-only. To connect Supabase later, paste keys in Settings (we will add wiring when you want).</Text>
          <Button onPress={() => Alert.alert("Saved (demo)", "Nothing saved — demo only")}>Save (demo)</Button>
        </View>
      </ScrollView>
    );
  }

  /* ---------- Stories modal ---------- */
  function StoriesModal() {
    if (!storyModal.show || !storyModal.user) return null;
    const u = storyModal.user;
    const s = u.stories || [];
    const current = s[storyModal.index] || null;
    return (
      <Modal visible={storyModal.show} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: "#000", padding: 16 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>{u.name} - {current ? current.title : "Stories"}</Text>
          {current && <Image source={{ uri: current.image }} style={{ width: "100%", height: 400, marginTop: 12, borderRadius: 8 }} />}
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <Button onPress={() => { if (storyModal.index + 1 < s.length) nextStory(); else closeStories(); }}>Next</Button>
            <Button onPress={() => closeStories()} style={{ marginLeft: 8 }}>Close</Button>
          </View>
        </View>
      </Modal>
    );
  }

  /* ---------- small helpers ---------- */
  function promptLocalText(title, cb) {
    // Snack cannot show text input prompt easily. For now show alert and call cb with sample.
    Alert.alert(title, "Demo uses placeholder text.", [{ text: "OK", onPress: () => cb("Demo text") }]);
  }

  /* ---------- navigation ---------- */
  function renderRoute() {
    switch (route) {
      case "home": return <Home />;
      case "signup": return <Signup />;
      case "login": return <Login />;
      case "feed": return <Feed />;
      case "create": return <CreatePost />;
      case "profile": return <Profile />;
      case "chat": return <Chat />;
      case "admin": return <AdminPanel />;
      case "settings": return <Settings />;
      case "groups": return <GroupsScreen />;
      case "minerals": return <MineralsScreen />;
      default: return <Home />;
    }
  }

  /* ---------- footer nav ---------- */
  function Footer() {
    return (
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => setRoute("home")} style={styles.footerBtn}><Text style={{ color: "#fff" }}>Home</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setRoute("feed")} style={styles.footerBtn}><Text style={{ color: "#fff" }}>Feed</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setRoute(currentUser ? "profile" : "login")} style={styles.footerBtn}><Text style={{ color: "#fff" }}>{currentUser ? "Profile" : "Login"}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setRoute("admin")} style={styles.footerBtn}><Text style={{ color: "#fff" }}>Admin</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setRoute("settings")} style={styles.footerBtn}><Text style={{ color: "#fff" }}>Settings</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {renderRoute()}
      <StoriesModal />
      <Footer />
    </View>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  btn: { backgroundColor: GOLD, color: "#000", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: PANEL, padding: 12, borderRadius: 10, borderColor: "#222", borderWidth: 1, marginBottom: 12 },
  input: { backgroundColor: "#0b0b0b", color: "#fff", padding: 10, borderRadius: 8, borderColor: "#222", borderWidth: 1, marginTop: 8 },
  post: { backgroundColor: "#111", padding: 12, borderRadius: 8, marginBottom: 12, borderColor: "#222", borderWidth: 1 },
  h2: { color: GOLD, fontSize: 18, fontWeight: "800" },
  footer: { height: 56, backgroundColor: "#050505", borderTopColor: "#111", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  footerBtn: { flex: 1, alignItems: "center", padding: 8 },
});
