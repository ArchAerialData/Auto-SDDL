// Copied from replit-production/static/js/sidebar.js with minimal changes
class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.isCollapsed = false;
        this.initializeEventListeners();
    }
    initializeEventListeners() {
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                this.toggleSidebar();
            }
        });
    }
    toggleSidebar() {
        this.isCollapsed = !this.isCollapsed;
        if (this.isCollapsed) {
            this.sidebar.style.width = '60px';
            this.sidebar.classList.add('collapsed');
            document.querySelector('.main-content').style.marginLeft = '60px';
            document.querySelectorAll('.sidebar .nav-link span').forEach(s => s.style.display = 'none');
            const brandText = document.querySelector('.brand-text');
            if (brandText) brandText.style.display = 'none';
        } else {
            this.sidebar.style.width = '280px';
            this.sidebar.classList.remove('collapsed');
            document.querySelector('.main-content').style.marginLeft = '280px';
            document.querySelectorAll('.sidebar .nav-link span').forEach(s => s.style.display = 'inline');
            const brandText = document.querySelector('.brand-text');
            if (brandText) brandText.style.display = 'inline';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.sidebarManager = new SidebarManager();
});
