window.addEventListener('load', function() {
    const preloader = document.getElementById('preloader');
    
    // Tunggu sebentar setelah halaman selesai dimuat, lalu sembunyikan preloader
    setTimeout(() => {
        preloader.classList.add('preloader-hidden');
    }, 500); // Waktu tunggu 0.5 detik untuk efek lebih halus
});

const registrationCountdown = document.getElementById("pendaftaran-countdown");

if (registrationCountdown) {
  const countdownParts = {
    days: registrationCountdown.querySelector("[data-countdown-days]"),
    hours: registrationCountdown.querySelector("[data-countdown-hours]"),
    minutes: registrationCountdown.querySelector("[data-countdown-minutes]"),
    seconds: registrationCountdown.querySelector("[data-countdown-seconds]"),
  };
  const deadline = new Date(new Date().getFullYear(), 10, 1);

  function updateRegistrationCountdown() {
    const remaining = Math.max(0, deadline.getTime() - Date.now());
    const seconds = Math.floor(remaining / 1000);
    const values = {
      days: Math.floor(seconds / 86400),
      hours: Math.floor((seconds % 86400) / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
      seconds: seconds % 60,
    };

    Object.entries(countdownParts).forEach(([unit, element]) => {
      element.textContent = String(values[unit]).padStart(2, "0");
    });
  }

  updateRegistrationCountdown();
  window.setInterval(updateRegistrationCountdown, 1000);
}

// Mencegah Inspect Element dan View Source
document.addEventListener("keydown", function (event) {
  if (
    (event.ctrlKey &&
      (event.key === "u" ||
        event.key === "i" ||
        event.key === "j" ||
        event.key === "s")) ||
    (event.ctrlKey &&
      event.shiftKey &&
      (event.key === "I" || event.key === "J" || event.key === "C")) ||
    event.key === "F12"
  ) {
    event.preventDefault();
    console.log("Inspect Element telah dinonaktifkan!"); // Debugging
  }
});
// Mencegah Drag & Drop pada Semua Gambar
document.addEventListener("dragstart", function (event) {
  event.preventDefault();
});
// Mencegah Klik Kanan pada Gambar Secara Spesifik
document.querySelectorAll("img").forEach((img) => {
  img.addEventListener("contextmenu", (event) => event.preventDefault());
});

const menuIcon = document.getElementById("menu-icon");
const menuList = document.getElementById("menu-list");

// Toggle buka/tutup menu (halaman lama, mis. daftar.html)
if (menuIcon && menuList) {
  menuIcon.addEventListener("click", () => {
    menuList.classList.toggle("active");
  });

  // Tutup menu saat link diklik (khusus mobile)
  document.querySelectorAll("#menu-list a").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");

      if (href.startsWith("#")) {
        e.preventDefault(); // hanya cegah scroll instan untuk anchor dalam halaman
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: "smooth",
          });
        }
      }

      // Setelah klik, tutup menu jika mobile
      if (window.innerWidth <= 1024) {
        menuList.classList.remove("active");
      }
    });
  });
}

// NAVBAR BARU (IT Bootcamp 2026 - Independent Project / itb-home.html)
// Toggle buka/tutup menu untuk #hamburgerBtn + #mainNav
(function () {
  const btn = document.getElementById("hamburgerBtn");
  const nav = document.getElementById("mainNav");
  if (!btn || !nav) return;

  function closeMenu() {
    nav.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  }
  function toggleMenu() {
    const isOpen = nav.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  btn.addEventListener("click", toggleMenu);

  nav.querySelectorAll(".nav__link").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) closeMenu();
  });
})();

// ### NAVBAR
// Navbar Fixed
const navMenu = document.querySelector('#nav-menu');

function updateNavbar() {
  const header = document.querySelector("#navbar");

  if (window.scrollY <= 400) {
    header.classList.remove("navbar-fixed");
    header.classList.add("navbar-absolute");
    header.style.transform = "translateY(0)";
    header.style.opacity = "1";
  } else if (window.scrollY <= 600) {
    header.style.transform = "translateY(-10px)";
    header.style.opacity = "0";
    navMenu.classList.remove("dropdown-appear");
    navMenu.classList.add("hidden");
  } else {
    header.classList.add("navbar-fixed");
    header.classList.remove("navbar-absolute");
    header.style.transform = "translateY(0)";
    header.style.opacity = "1";
  }
}

window.addEventListener("scroll", updateNavbar);
updateNavbar();

// LIVE HERO SECTION
document.addEventListener("DOMContentLoaded", function () {
  const liveHero = document.querySelector(".live-hero");
  const items = Array.from(document.querySelectorAll(".live-hero .live"));

  // Duplikasi elemen agar animasi berjalan tanpa jeda
  items.forEach((item) => {
    const clone = item.cloneNode(true);
    liveHero.appendChild(clone);
  });
});

// DOKUMENTASI SECTION
document.addEventListener("DOMContentLoaded", function () {
    const track = document.getElementById("slide-track-1");
    if (!track) return;

    // Array 14 foto lengkap milik ITB
    const allImages = Array.from({ length: 14 }, (_, i) => `assets/img/dokumentasi/bg-it-bootcamp-${i + 1}.webp`);

    // 1. DUPLIKASI SLIDE & SWAP FOTO KE-8 SAMPAI KE-14
    const originalChildren = Array.from(track.children);
    originalChildren.forEach((child, idx) => {
        const clone = child.cloneNode(true);
        const cloneImg = clone.querySelector("img");
        
        // Pasang foto 8 - 14 ke elemen kloning
        if (cloneImg && allImages[idx + 7]) {
            cloneImg.src = allImages[idx + 7];
        }
        track.appendChild(clone);
    });

    // 2. SETUP POPUP GALLERY
    const popup = document.getElementById("popup-1");
    const closeBtn = document.getElementById("close-btn-1");
    const largeImage = document.getElementById("large-image-1");
    const imageIndex = document.getElementById("index-1");
    const leftArrow = document.getElementById("left-arrow-1");
    const rightArrow = document.getElementById("right-arrow-1");

    let currentIndex = 0;

    const imageCaptions = [
        "Rapat Bersama Pak Arif",
        "Pengabdian Masyarakat",
        "Brainstorming & Diskusi",
        "Pembuatan Nocola Inspired Controlling Agriculture",
        "Pembuatan Greenhouse Monitoring System di Desa Seboto",
        "Persiapan Posko PPK Ormawa",
        "Diskusi dan Presentasi",
        "Proses Pemrograman dan Pembuatan Prototype",
        "Berbagi Pendapat",
        "Kembali ke Kantor Prodi",
        "Persiapan Pembuatan Fundamental Greenhouse",
        "Focus Discussion Group (FGD)",
        "Percobaan dan Evaluasi",
        "Kunjungan Lapangan ke Desa Seboto"
    ];

    const popupCaption = document.getElementById("popup-caption-1");

    function updatePopup(index) {
        currentIndex = (index + allImages.length) % allImages.length;
        largeImage.src = allImages[currentIndex];
        imageIndex.textContent = String(currentIndex + 1).padStart(2, '0');
        
        // Update teks caption sesuai index gambar yang aktif
        if (popupCaption) {
            popupCaption.textContent = imageCaptions[currentIndex] || "Dokumentasi IT Bootcamp";
        }
    }

    function closePopup() {
        popup.classList.remove("active");
        document.body.style.overflow = "";
    }

    // Event Klik Kartu / Foto di Slider
    track.addEventListener("click", function (e) {
        const clickedSlide = e.target.closest(".slide");
        if (!clickedSlide) return;

        const img = clickedSlide.querySelector("img");
        if (img) {
            // Cari index foto dari path src-nya
            const src = img.getAttribute("src");
            const foundIdx = allImages.findIndex(path => src.includes(path));
            updatePopup(foundIdx !== -1 ? foundIdx : 0);
            
            popup.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    });

    closeBtn.addEventListener("click", closePopup);

    leftArrow.addEventListener("click", (e) => {
        e.stopPropagation();
        updatePopup(currentIndex - 1);
    });

    rightArrow.addEventListener("click", (e) => {
        e.stopPropagation();
        updatePopup(currentIndex + 1);
    });

    popup.addEventListener("click", function (e) {
        if (e.target === popup) closePopup();
    });

    document.addEventListener("keydown", function (e) {
        if (!popup.classList.contains("active")) return;
        
        if (e.key === "Escape") closePopup();
        if (e.key === "ArrowLeft") updatePopup(currentIndex - 1);
        if (e.key === "ArrowRight") updatePopup(currentIndex + 1);
    });
});
