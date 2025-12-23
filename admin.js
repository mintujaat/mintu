import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy
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
const loader = document.getElementById("loader");

/* Profile */
const saveProfile = document.getElementById("saveProfile");
const profilePic = document.getElementById("profilePic");
const profileName = document.getElementById("profileName");
const profileSubtitle = document.getElementById("profileSubtitle");

/* Socials */
const addSocial = document.getElementById("addSocial");
const socialName = document.getElementById("socialName");
const socialIcon = document.getElementById("socialIcon");
const socialUrl = document.getElementById("socialUrl");
const socialEnabled = document.getElementById("socialEnabled");
const socialList = document.getElementById("socialList");

/* Navigation */
const addNav = document.getElementById("addNav");
const navLabel = document.getElementById("navLabel");
const navUrl = document.getElementById("navUrl");
const navNewTab = document.getElementById("navNewTab");
const navEnabled = document.getElementById("navEnabled");
const navList = document.getElementById("navList");

/* Posts */
const addPost = document.getElementById("addPost");
const postImage = document.getElementById("postImage");
const postCaption = document.getElementById("postCaption");
const postList = document.getElementById("postList");

/* Visitors */
const visitorList = document.getElementById("visitorList");

/* ================= LOADER ================= */
const showLoader = () => loader?.classList.remove("hidden");
const hideLoader = () => loader?.classList.add("hidden");

/* ================= TABS ================= */
document.querySelectorAll(".sidebar button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(btn.dataset.tab)?.classList.add("active");

    if (btn.dataset.tab === "visitors") loadVisitors();
  };
});

/* ================= PROFILE ================= */
saveProfile.onclick = async () => {
  showLoader();
  await setDoc(doc(db, "profile", "main"), {
    profilePic: profilePic.value,
    name: profileName.value,
    subtitle: profileSubtitle.value
  });
  hideLoader();
};

/* ================= SOCIALS ================= */
addSocial.onclick = async () => {
  showLoader();
  await addDoc(collection(db, "socials"), {
    name: socialName.value,
    icon: socialIcon.value,
    url: socialUrl.value,
    enabled: socialEnabled.checked
  });
  socialName.value = socialIcon.value = socialUrl.value = "";
  socialEnabled.checked = true;
  loadSocials();
  hideLoader();
};

async function loadSocials() {
  socialList.innerHTML = "";
  const snap = await getDocs(collection(db, "socials"));
  snap.forEach(d => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<span>${d.data().name}</span><button>Delete</button>`;
    div.querySelector("button").onclick = async () => {
      showLoader();
      await deleteDoc(doc(db, "socials", d.id));
      loadSocials();
      hideLoader();
    };
    socialList.appendChild(div);
  });
}
loadSocials();

/* ================= NAVIGATION ================= */
addNav.onclick = async () => {
  if (!navLabel.value || !navUrl.value) {
    alert("Label and URL required");
    return;
  }

  await addDoc(collection(db, "navigation"), {
    label: navLabel.value,
    url: navUrl.value,
    newTab: navNewTab.checked,
    enabled: navEnabled.checked,
    createdAt: Date.now()
  });

  navLabel.value = navUrl.value = "";
  navNewTab.checked = true;
  navEnabled.checked = true;
  loadNav();
};

async function loadNav() {
  navList.innerHTML = "";
  const snap = await getDocs(collection(db, "navigation"));
  snap.forEach(d => {
    const n = d.data();
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <strong>${n.label}</strong><br>
      <small>${n.url}</small><br>
      <small>${n.newTab ? "New Tab" : "Same Tab"}</small>
      <button>Delete</button>
    `;
    div.querySelector("button").onclick = async () => {
      await deleteDoc(doc(db, "navigation", d.id));
      loadNav();
    };
    navList.appendChild(div);
  });
}
loadNav();

/* ================= POSTS ================= */
addPost.onclick = async () => {
  showLoader();
  await addDoc(collection(db, "posts"), {
    imageUrl: postImage.value,
    caption: postCaption.value,
    createdAt: Date.now(),
    published: true
  });
  postImage.value = postCaption.value = "";
  loadPosts();
  hideLoader();
};

async function loadPosts() {
  postList.innerHTML = "";
  const snap = await getDocs(collection(db, "posts"));
  snap.forEach(d => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<span>${d.data().caption}</span><button>Delete</button>`;
    div.querySelector("button").onclick = async () => {
      showLoader();
      await deleteDoc(doc(db, "posts", d.id));
      loadPosts();
      hideLoader();
    };
    postList.appendChild(div);
  });
}
loadPosts();

/* ================= VISITORS (FINAL + DELETE + IP) ================= */
async function loadVisitors() {
  if (!visitorList) return;

  visitorList.innerHTML = "";
  showLoader();

  const snap = await getDocs(
    query(collection(db, "visitors"), orderBy("visitedAt", "desc"))
  );

  snap.forEach(d => {
    const v = d.data();

    const div = document.createElement("div");
    div.className = "list-item";

    div.innerHTML = `
      <div>
        <strong>${v.device || "—"}</strong> • ${v.browser || "—"}<br>
        <small>
          IP: ${v.ip || "—"}<br>
          ${v.city || ""} ${v.region || ""} ${v.country || ""}<br>
          OS: ${v.os || "—"} | Screen: ${v.screen || "—"}<br>
          ${v.visitedAt?.seconds
            ? new Date(v.visitedAt.seconds * 1000).toLocaleString()
            : ""}
        </small>
      </div>
      <button class="danger">Delete</button>
    `;

    div.querySelector(".danger").onclick = async () => {
      const ok = confirm("Delete this visitor?");
      if (!ok) return;

      showLoader();
      await deleteDoc(doc(db, "visitors", d.id));
      loadVisitors();
      hideLoader();
    };

    visitorList.appendChild(div);
  });

  hideLoader();
}
/* ================= DELETE ALL VISITORS ================= */
const deleteAllBtn = document.getElementById("deleteAllVisitors");

deleteAllBtn.onclick = async () => {
  const confirm1 = confirm("⚠️ This will delete ALL visitors. Continue?");
  if (!confirm1) return;

  const confirm2 = confirm("❗ Are you REALLY sure? This cannot be undone.");
  if (!confirm2) return;

  showLoader();

  const snap = await getDocs(collection(db, "visitors"));
  const promises = [];

  snap.forEach(d => {
    promises.push(deleteDoc(doc(db, "visitors", d.id)));
  });

  await Promise.all(promises);

  visitorList.innerHTML = "";
  hideLoader();

  alert("✅ All visitors deleted");
};
