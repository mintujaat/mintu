import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  increment,
  updateDoc,
  setDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/* ================= FIREBASE ================= */
const firebaseConfig = {
  apiKey: "AIzaSyCGnqFDBgUcBkl4TA2HYe8U-enFtuzpW8I",
  authDomain: "mintuuu.firebaseapp.com",
  projectId: "mintuuu",
  messagingSenderId: "795208515782",
  appId: "1:795208515782:web:b6649939729ceb669197c7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ================= DOM ================= */
const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");
const themeToggle = document.getElementById("themeToggle");

/* ================= UI ================= */
menuBtn.onclick = () => menu.classList.toggle("show");
themeToggle.onclick = () => document.body.classList.toggle("light");

/* ================= PROFILE ================= */
async function loadProfile() {
  const snap = await getDoc(doc(db, "profile", "main"));
  if (!snap.exists()) return;
  const d = snap.data();

  document.querySelector(".avatar").src = d.profilePic;
  document.querySelector("h1").innerText = d.name;
  document.querySelector(".subtitle").innerText = d.subtitle;
}

/* ================= SOCIALS ================= */
async function loadSocials() {
  const box = document.querySelector(".socials");
  box.innerHTML = "";

  const snap = await getDocs(collection(db, "socials"));
  snap.forEach(docu => {
    const s = docu.data();
    if (!s.enabled) return;

    const a = document.createElement("a");
    a.href = s.url;
    a.target = "_blank";
    a.innerHTML = `<i class="fa-brands ${s.icon}"></i>`;
    box.appendChild(a);
  });
}

/* ================= NAVIGATION ================= */
async function loadNav() {
  menu.innerHTML = "";
  const snap = await getDocs(collection(db, "navigation"));

  snap.forEach(docu => {
    const n = docu.data();
    if (!n.enabled) return;

    const btn = document.createElement("button");
    btn.innerText = n.label;

    btn.onclick = () => {
      n.newTab ? window.open(n.url, "_blank") : (window.location.href = n.url);
      menu.classList.remove("show");
    };

    menu.appendChild(btn);
  });
}

/* ================= POSTS (🔥 FIRESTORE LIKES) ================= */
async function loadPosts() {
  const feed = document.querySelector(".feed");
  feed.innerHTML = "";

  let snap;
  try {
    snap = await getDocs(
      query(
        collection(db, "posts"),
        where("published", "==", true),
        orderBy("createdAt", "desc")
      )
    );
  } catch {
    snap = await getDocs(collection(db, "posts"));
  }

  snap.forEach(docu => {
    const p = docu.data();
    const id = docu.id;

    const liked = localStorage.getItem("liked_" + id) === "true";
    const count = Number(p.likeCount) || 0;

    const post = document.createElement("div");
    post.className = "post";

    post.innerHTML = `
      <div class="post-header"><strong>${p.name || "Mintu Jaat 👑"}</strong></div>

      <div class="post-image">
        <img src="${p.imageUrl}" alt="post">
      </div>

      <div class="post-caption">${p.caption}</div>

      <div class="post-actions">
        <button class="like ${liked ? "liked" : ""}">❤️</button>
        <span class="count">${count}</span>
        <button class="share">🔗</button>
      </div>
    `;

    const likeBtn = post.querySelector(".like");
    const countEl = post.querySelector(".count");

    likeBtn.onclick = async () => {
      if (localStorage.getItem("liked_" + id)) return;

      // Optimistic UI
      localStorage.setItem("liked_" + id, "true");
      likeBtn.classList.add("liked");
      countEl.innerText = Number(countEl.innerText) + 1;

      try {
        await updateDoc(doc(db, "posts", id), {
          likeCount: increment(1)
        });
      } catch (e) {
        // rollback
        localStorage.removeItem("liked_" + id);
        likeBtn.classList.remove("liked");
        countEl.innerText = Number(countEl.innerText) - 1;
        console.error("Like failed", e);
      }
    };

    post.querySelector(".share").onclick = async () => {
      await navigator.clipboard.writeText(location.href + "#" + id);
      alert("Post link copied");
    };

    feed.appendChild(post);
  });
}

/* ================= VIEW COUNTER ================= */
async function handleViews() {
  const today = new Date().toISOString().slice(0, 10);
  const ref = doc(db, "siteStats", "views");
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, { total: 1, today: 1, lastDate: today });
  } else {
    const d = snap.data();
    if (d.lastDate === today) {
      await updateDoc(ref, { total: increment(1), today: increment(1) });
    } else {
      await updateDoc(ref, { total: increment(1), today: 1, lastDate: today });
    }
  }

  const s = await getDoc(ref);
  document.getElementById("todayViews").innerText = "Today view: " + s.data().today;
  document.getElementById("totalViews").innerText = "Total view: " + s.data().total;
}

/* ================= VISITOR TRACKING ================= */
async function saveVisitorInfo() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const ip = await res.json();
    const ua = navigator.userAgent;

    await addDoc(collection(db, "visitors"), {
      ip: ip.ip || "Unknown",
      country: ip.country_name || "",
      region: ip.region || "",
      city: ip.city || "",
      device: /Android|iPhone/i.test(ua) ? "Mobile" : "Desktop",
      browser: ua.includes("Chrome")
        ? "Chrome"
        : ua.includes("Firefox")
        ? "Firefox"
        : ua.includes("Safari")
        ? "Safari"
        : "Unknown",
      os: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      visitedAt: serverTimestamp()
    });
  } catch (e) {
    console.warn("Visitor tracking failed");
  }
}

/* ================= LOADER ================= */
document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loaderScreen");
  const text = document.getElementById("typingText");
  const box = document.querySelector(".loader-box");

  async function type(t) {
    for (let i = 0; i < t.length; i++) {
      text.textContent += t[i];
      await new Promise(r => setTimeout(r, 80));
    }
  }

  if (loader && text && box) {
    (async () => {
      await type("Mintu Jaat 👑");
      await new Promise(r => setTimeout(r, 200));
      box.classList.add("exit");
      setTimeout(() => loader.remove(), 450);
    })();
  }

  startApp();
});

/* ================= START ================= */
function startApp() {
  loadProfile();
  loadSocials();
  loadNav();
  loadPosts();
  handleViews();
  saveVisitorInfo();
}
