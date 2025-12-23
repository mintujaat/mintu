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

/* ================= DOM ================= */
const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");
const themeToggle = document.getElementById("themeToggle");

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
      if (n.newTab) {
        window.open(n.url, "_blank");
      } else {
        window.location.href = n.url;
      }
      menu.classList.remove("show");
    };

    menu.appendChild(btn);
  });
}

/* ================= POSTS ================= */
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

    const liked = localStorage.getItem(id + "_liked") === "true";
    const count = Number(localStorage.getItem(id + "_count")) || 0;

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

    likeBtn.onclick = () => {
      if (localStorage.getItem(id + "_liked") === "true") return;
      localStorage.setItem(id + "_liked", "true");
      localStorage.setItem(id + "_count", count + 1);
      countEl.innerText = count + 1;
      likeBtn.classList.add("liked");
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
    await setDoc(ref, {
      total: 1,
      today: 1,
      lastDate: today
    });
  } else {
    const data = snap.data();
    if (data.lastDate === today) {
      await updateDoc(ref, {
        total: increment(1),
        today: increment(1)
      });
    } else {
      await updateDoc(ref, {
        total: increment(1),
        today: 1,
        lastDate: today
      });
    }
  }

  loadViewCounts();
}

async function loadViewCounts() {
  const snap = await getDoc(doc(db, "siteStats", "views"));
  if (!snap.exists()) return;

  const d = snap.data();
  document.getElementById("todayViews").innerText = "Today view: " + d.today;
  document.getElementById("totalViews").innerText = "Total view: " + d.total;
}

/* ================= VISITOR TRACKING (IP + LOCATION) ================= */
async function saveVisitorInfo() {
  try {
    // 🌍 IP + location API
    const res = await fetch("https://ipapi.co/json/");
    const ipData = await res.json();

    const ua = navigator.userAgent;

    const visitor = {
      ip: ipData.ip || "Unknown",
      country: ipData.country_name || "Unknown",
      region: ipData.region || "Unknown",
      city: ipData.city || "Unknown",

      device: /Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop",
      os: navigator.platform || "Unknown",
      browser: ua.includes("Chrome")
        ? "Chrome"
        : ua.includes("Firefox")
        ? "Firefox"
        : ua.includes("Safari")
        ? "Safari"
        : "Unknown",

      screen: `${screen.width}x${screen.height}`,
      visitedAt: serverTimestamp()
    };

    await addDoc(collection(db, "visitors"), visitor);
  } catch (e) {
    console.error("Visitor save failed:", e);
  }
}


/* ================= LOADER ================= */
document.addEventListener("DOMContentLoaded", () => {
  const loaderScreen = document.getElementById("loaderScreen");
  const typingText = document.getElementById("typingText");
  const loaderBox = document.querySelector(".loader-box");

  if (!loaderScreen || !typingText || !loaderBox) {
    startApp();
    return;
  }

  function typeText(text, speed = 65) {
    return new Promise(resolve => {
      let i = 0;
      typingText.textContent = "";
      const interval = setInterval(() => {
        typingText.textContent += text[i++];
        if (i >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  }

  async function runLoader() {
    await typeText("Mintu Jaat 👑", 85);
    await new Promise(r => setTimeout(r, 150));
    loaderBox.classList.add("exit");
    await new Promise(r => setTimeout(r, 450));
    loaderScreen.remove();
  }

  setTimeout(() => {
    if (document.getElementById("loaderScreen")) {
      document.getElementById("loaderScreen").remove();
    }
  }, 2000);

  runLoader();
  startApp();
});

/* ================= APP START ================= */
function startApp() {
  loadProfile();
  loadSocials();
  loadNav();
  loadPosts();
  handleViews();
  saveVisitorInfo(); // 🔥 VISITOR NOW SAVED
}
