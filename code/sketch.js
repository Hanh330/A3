// Function xử lý hiển thị menu trên Mobile (Hamburger Menu)
function toggleMenu() {
    const nav = document.querySelector('.desktop-nav');
    const hamburger = document.querySelector('.hamburger');
    
    // Kích hoạt hoặc hủy kích hoạt class 'active'
    nav.classList.toggle('active');
    
    // Kiểm tra trạng thái để đổi icon hiển thị và khóa cuộn trang
    if (nav.classList.contains('active')) {
        hamburger.innerHTML = '✕'; // Đổi icon thành dấu X khi mở menu
        document.body.style.overflow = 'hidden'; // Khóa cuộn trang nền
    } else {
        hamburger.innerHTML = '☰'; // Đổi lại thành icon hamburger khi đóng
        document.body.style.overflow = 'auto'; // Cho phép cuộn trang lại bình thường
    }
}

// Tự động đóng menu khi người dùng nhấn vào một đường link điều hướng ẩn
document.querySelectorAll('.desktop-nav a').forEach(link => {
    link.addEventListener('click', () => {
        const nav = document.querySelector('.desktop-nav');
        if (nav.classList.contains('active')) {
            toggleMenu();
        }
    });
});

function keyPressed() {
  if (key === 'f' || key === 'F') fullscreen(!fullscreen());
}

const clickSound = new Audio('phuc-sounds/mouse click.wav');

clickSound.volume = 0.4;

document.addEventListener('click', () => {

    const s = clickSound.cloneNode();

    s.volume = 0.4;

    s.play();
});