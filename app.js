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

/* ================= SAFE HELPERS ================= */
const $ = id => document.getElementById(id);
const exists = el => el !== null && el !== undefined;

/* ================= UI ================= */
const menuBtn = $("menuBtn");
const menu = $("menu");
const themeToggle = $("themeToggle");

if (exists(menuBtn) && exists(menu)) {
  menuBtn.onclick = () => menu.classList.toggle("show");
}

if (exists(themeToggle)) {
  themeToggle.onclick = () => document.body.classList.toggle("light");
}

/* ================= PROFILE ================= */
async function loadProfile() {
  try {
    const snap = await getDoc(doc(db, "profile", "main"));
    if (!snap.exists()) return;

    const d = snap.data();
    const avatar = document.querySelector(".avatar");
    const name = document.querySelector("h1");
    const subtitle = document.querySelector(".subtitle");

    if (avatar) avatar.src = d.profilePic || "";
    if (name) name.innerText = d.name || "";
    if (subtitle) subtitle.innerText = d.subtitle || "";
  } catch (e) {
    console.warn("Profile load failed");
  }
}

/* ================= SOCIALS ================= */
async function loadSocials() {
  try {
    const box = document.querySelector(".socials");
    if (!box) return;
    box.innerHTML = "";

    const snap = await getDocs(collection(db, "socials"));
    snap.forEach(snapDoc => {
      const s = snapDoc.data();
      if (!s.enabled) return;

      const a = document.createElement("a");
      a.href = s.url;
      a.target = "_blank";
      a.innerHTML = `<i class="fa-brands ${s.icon}"></i>`;
      box.appendChild(a);
    });
  } catch {
    console.warn("Socials load failed");
  }
}

/* ================= NAVIGATION (ADMIN ORDER SAFE) ================= */
async function loadNav() {
  if (!menu) return;
  menu.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "navigation"));
    const items = [];

    snap.forEach(d => {
      const n = d.data();
      if (!n.enabled) return;

      items.push({
        label: n.label,
        url: n.url,
        newTab: !!n.newTab,
        order: typeof n.order === "number" ? n.order : 999
      });
    });

    items.sort((a, b) => a.order - b.order);

    items.forEach(n => {
      const btn = document.createElement("button");
      btn.textContent = n.label;

      btn.onclick = () => {
        n.newTab ? window.open(n.url, "_blank") : (window.location.href = n.url);
        menu.classList.remove("show");
      };

      menu.appendChild(btn);
    });
  } catch (e) {
    console.warn("Navigation load failed");
  }
}

/* ================= POSTS (LIKES SAFE) ================= */
async function loadPosts() {
  const feed = document.querySelector(".feed");
  if (!feed) return;
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
        <img src="${p.imageUrl || ""}">
      </div>
      <div class="post-caption">${p.caption || ""}</div>
      <div class="post-actions">
        <button class="like ${liked ? "liked" : ""}">❤️ ${liked ? "Liked" : "Like"}</button>
        <span class="count">${count}</span>
        <button class="share">🔗</button>
      </div>
    `;

    const likeBtn = post.querySelector(".like");
    const countEl = post.querySelector(".count");

    likeBtn.onclick = async () => {
      if (localStorage.getItem("liked_" + id)) return;

      localStorage.setItem("liked_" + id, "true");
      likeBtn.classList.add("liked");
      likeBtn.innerText = "❤️ Liked";
      countEl.innerText = Number(countEl.innerText) + 1;

      try {
        await updateDoc(doc(db, "posts", id), {
          likeCount: increment(1)
        });
      } catch {
        localStorage.removeItem("liked_" + id);
        likeBtn.classList.remove("liked");
        likeBtn.innerText = "❤️ Like";
        countEl.innerText = Number(countEl.innerText) - 1;
      }
    };

    post.querySelector(".share").onclick = async () => {
      await navigator.clipboard.writeText(location.href + "#" + id);
      alert("Post link copied");
    };

    feed.appendChild(post);
  });
}

/* ================= VIEW COUNTER (SAFE) ================= */
async function handleViews() {
  try {
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
    const tv = $("todayViews");
    const av = $("totalViews");

    if (exists(tv)) tv.innerText = "Today view: " + s.data().today;
    if (exists(av)) av.innerText = "Total view: " + s.data().total;
  } catch {
    console.warn("View counter failed");
  }
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
  } catch {}
}

/* ================= START ================= */
document.addEventListener("DOMContentLoaded", () => {
  loadProfile();
  loadSocials();
  loadNav();
  loadPosts();
  handleViews();
  saveVisitorInfo();
});

/* ================= LOADER + TYPING (EXACT FINISH BASED) ================= */

document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loaderScreen");
  const textEl = document.getElementById("typingText");

  if (!loader || !textEl) return;

  const text = "Mintu Jaat 👑";
  const speed = 80; // typing speed (ms)
  let i = 0;

  function typeNext() {
    if (i < text.length) {
      textEl.textContent += text.charAt(i);
      i++;
      setTimeout(typeNext, speed);
    } else {
      // ✅ typing FINISHED — now hide loader
      setTimeout(hideLoader, 500); // small pause after full name
    }
  }

  function hideLoader() {
    loader.style.opacity = "0";
    loader.style.pointerEvents = "none";

    setTimeout(() => {
      loader.remove();
    }, 400);
  }

  // reset text (safety)
  textEl.textContent = "";

  // start typing
  typeNext();
});
