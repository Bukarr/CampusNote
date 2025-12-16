// CampusNote - Enhanced Academic Platform
// Main Application JavaScript

// ==================== CONFIGURATION & INITIALIZATION ====================
const supabaseUrl = 'https://nijpmtwihccpaqsiirva.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5panBtdHdpaGNjcGFxc2lpcnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTI3MjQsImV4cCI6MjA3NDcyODcyNH0.aepDRx4Ew0zHdS6HAOUi1C8NXdMXvX5cf5ScQyfrvCM';

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let currentCourse = null;
let currentViewedUser = null;
let discussionSubscription = null;
let notesSubscription = null;
let assignmentsSubscription = null;
let pastQuestionsSubscription = null;
let displayedMessageIds = new Set();
let allNotes = [];
let allAssignments = [];
let allPastQuestions = [];
let allCourses = [];
let currentPreviewFile = null;
let navigationHistory = [];
let isBackNavigation = false;
let userProfilesCache = new Map();
let authRequestCount = 0;
const MAX_AUTH_REQUESTS = 5;

// ==================== UTILITY FUNCTIONS ====================
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Invalid Date';
    }
}

function formatTime(dateString) {
    try {
        const date = new Date(dateString);
        const options = { hour: '2-digit', minute: '2-digit' };
        return date.toLocaleTimeString(undefined, options);
    } catch (error) {
        console.error('Time formatting error:', error);
        return 'Invalid Time';
    }
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getInitials(name) {
    if (!name || typeof name !== 'string') return 'U';
    try {
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    } catch (error) {
        console.error('Error getting initials:', error);
        return 'U';
    }
}

function getColorFromName(name) {
    if (!name) return '#1a237e';
    
    const colors = [
        '#1a237e', '#0d47a1', '#2196f3', '#1565c0',
        '#1976d2', '#0288d1', '#0097a7', '#00695c'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => {
        if (n.parentNode) n.parentNode.removeChild(n);
    });

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 400px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
    `;
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
            <div class="flex-grow-1">${message}</div>
            <button class="btn btn-sm btn-light ms-2" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

function setButtonLoading(button, buttonText, isLoading) {
    if (!button || !buttonText) return;
    
    if (isLoading) {
        button.disabled = true;
        button.classList.add('button-loading');
        if (buttonText.textContent) {
            buttonText.dataset.originalText = buttonText.textContent;
        }
        buttonText.textContent = 'Processing...';
    } else {
        button.disabled = false;
        button.classList.remove('button-loading');
        if (buttonText.dataset.originalText) {
            buttonText.textContent = buttonText.dataset.originalText;
            delete buttonText.dataset.originalText;
        }
    }
}

function showProgressOverlay(text = 'Processing...') {
    const overlay = document.getElementById('progressOverlay');
    const progressText = document.getElementById('progressText');
    
    if (overlay) overlay.style.display = 'flex';
    if (progressText) progressText.textContent = text;
}

function hideProgressOverlay() {
    const overlay = document.getElementById('progressOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ==================== MAIN INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 CampusNote - Modern Academic Platform');
    
    if (!supabase) {
        console.error('❌ Supabase client not available');
        showNotification('Application initialization failed. Please refresh the page.', 'error');
        return;
    }
    
    initializeApp();
    setupEventListeners();
    checkAuthState();
    setupFileUploadHandlers();
    setupSearchFunctionality();
    setupBackNavigation();
    initializePWA();
    setupNetworkDetection();
    
    console.log('✅ Application initialized successfully');
});

function initializeApp() {
    console.log('🔧 Initializing application...');
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// ==================== AUTHENTICATION FUNCTIONS ====================
async function checkAuthState() {
    console.log('🔐 Checking authentication state');
    
    if (!supabase) {
        console.error('❌ Supabase not available');
        showUnauthenticatedUI();
        return;
    }
    
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        authRequestCount++;
        
        if (authRequestCount > MAX_AUTH_REQUESTS) {
            console.log('🚫 Too many auth requests, stopping...');
            return;
        }
        
        if (error) {
            console.error('❌ Session error:', error);
            showUnauthenticatedUI();
            return;
        }
        
        if (session) {
            console.log('✅ User authenticated:', session.user.email);
            currentUser = session.user;
            await loadUserProfile();
            showAuthenticatedUI();
            loadDashboardData();
            setupRealtimeSubscriptions();
            initializeRealtimeMonitoring();
        } else {
            console.log('❌ No active session');
            showUnauthenticatedUI();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showUnauthenticatedUI();
    }
}

function showLoginForm(e) { 
    if (e) e.preventDefault(); 
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    switchSection('auth-section');
}

function showSignupForm(e) { 
    if (e) e.preventDefault(); 
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    switchSection('auth-section');
}

async function handleLogin(e) {
    e.preventDefault();
    console.log('🔐 Login attempt started');
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    
    if (!email || !password) {
        if (errorDiv) {
            errorDiv.textContent = 'Please enter both email and password';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    try {
        setButtonLoading(loginBtn, loginBtnText, true);
        
        console.log('📧 Attempting login for:', email);
        const { data, error } = await supabase.auth.signInWithPassword({ 
            email: email, 
            password: password 
        });
        
        if (error) throw error;
        
        console.log('✅ Login successful for:', data.user.email);
        currentUser = data.user;
        
        await loadUserProfile();
        showAuthenticatedUI();
        loadDashboardData();
        setupRealtimeSubscriptions();
        initializeRealtimeMonitoring();
        
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        if (errorDiv) errorDiv.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Login failed:', error);
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    } finally {
        setButtonLoading(loginBtn, loginBtnText, false);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    console.log('👤 Signup attempt started');
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const level = document.getElementById('signupLevel').value;
    const department = document.getElementById('signupDepartment').value;
    const errorDiv = document.getElementById('signupError');
    const signupBtn = document.getElementById('signupBtn');
    const signupBtnText = document.getElementById('signupBtnText');
    
    if (!name || !email || !password || !level || !department) {
        if (errorDiv) {
            errorDiv.textContent = 'Please fill in all fields';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    if (password.length < 6) {
        if (errorDiv) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    try {
        setButtonLoading(signupBtn, signupBtnText, true);
        
        console.log('📝 Attempting signup for:', email);
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: { 
                data: { 
                    name: name, 
                    level: level, 
                    department: department 
                } 
            }
        });
        
        if (error) throw error;
        
        console.log('✅ Signup successful for:', data.user.email);
        
        // Create user profile in database
        try {
            const { error: profileError } = await supabase.from('profiles').insert([{
                id: data.user.id,
                name: name,
                email: email,
                level: level,
                department: department,
                created_at: new Date().toISOString()
            }]);
            
            if (profileError) {
                console.warn('⚠️ Profile creation warning:', profileError);
            }
        } catch (profileError) {
            console.warn('⚠️ Profile creation issue:', profileError);
        }
        
        showNotification('Signup successful! Please check your email for verification.', 'success');
        document.getElementById('signupFormElement').reset();
        if (errorDiv) errorDiv.style.display = 'none';
        showLoginForm();
        
    } catch (error) {
        console.error('❌ Signup failed:', error);
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    } finally {
        setButtonLoading(signupBtn, signupBtnText, false);
    }
}

async function handleLogout() {
    try {
        showProgressOverlay('Logging out...');
        removeAllSubscriptions();
        await supabase.auth.signOut();
        currentUser = null;
        currentCourse = null;
        showUnauthenticatedUI();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed: ' + error.message, 'error');
    } finally {
        hideProgressOverlay();
    }
}

// ==================== UI STATE MANAGEMENT ====================
function showAuthenticatedUI() {
    console.log('🔓 Showing authenticated UI');
    
    const authSection = document.getElementById('auth-section');
    if (authSection) {
        authSection.classList.remove('active');
        authSection.style.display = 'none';
    }
    
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = 'flex';
    }
    
    updateUserMenu(true);
    switchSection('dashboard');
}

function showUnauthenticatedUI() {
    console.log('🔒 Showing unauthenticated UI');
    
    const authSection = document.getElementById('auth-section');
    if (authSection) {
        authSection.classList.add('active');
        authSection.style.display = 'block';
    }
    
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = 'none';
    }
    
    updateUserMenu(false);
}

function updateUserMenu(isAuthenticated) {
    const unauthenticatedMenu = document.getElementById('unauthenticatedMenu');
    const authenticatedMenu = document.getElementById('authenticatedMenu');
    const userIcon = document.getElementById('userIcon');
    
    console.log('🔄 Updating user menu, authenticated:', isAuthenticated);
    
    if (isAuthenticated && currentUser) {
        if (unauthenticatedMenu) unauthenticatedMenu.style.display = 'none';
        if (authenticatedMenu) authenticatedMenu.style.display = 'block';
        
        const dropdownUserName = document.getElementById('dropdownUserName');
        if (dropdownUserName && currentUser.profile) {
            dropdownUserName.textContent = currentUser.profile.name;
        }
    } else {
        if (unauthenticatedMenu) unauthenticatedMenu.style.display = 'block';
        if (authenticatedMenu) authenticatedMenu.style.display = 'none';
    }
}

// ==================== NAVIGATION SYSTEM ====================
function setupBackNavigation() {
    console.log('🔙 Setting up back navigation system');
    
    window.addEventListener('popstate', function(event) {
        console.log('📚 Browser navigation:', event.state);
        if (navigationHistory.length > 0) {
            isBackNavigation = true;
            const previousSection = navigationHistory.pop();
            console.log('↩️ Going back to:', previousSection);
            switchSection(previousSection, true);
        }
    });
    
    window.history.replaceState({ section: 'auth-section' }, '', '#auth-section');
    navigationHistory = [];
}

function switchSection(sectionId, fromBackNavigation = false) {
    console.log('🔄 Switching to section:', sectionId, 'fromBack:', fromBackNavigation);
    
    if (sectionId !== 'auth-section' && !currentUser) {
        console.log('🚫 Unauthorized access attempt to:', sectionId);
        showUnauthenticatedUI();
        return;
    }
    
    if (!fromBackNavigation && !isBackNavigation) {
        const currentSection = document.querySelector('.section.active');
        if (currentSection && currentSection.id !== sectionId) {
            navigationHistory.push(currentSection.id);
            window.history.pushState({ section: sectionId }, '', `#${sectionId}`);
        }
    }
    
    isBackNavigation = false;
    
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }
    
    updateBottomNavForSection(sectionId);
    
    const sectionHandlers = {
        'dashboard': loadDashboardData,
        'notes': loadNotes,
        'assignments': loadAssignments,
        'past-questions': loadPastQuestions,
        'discussion': loadDiscussionCourses,
        'profile': loadUserProfileData,
        'community': loadCommunityUsers
    };
    
    if (sectionHandlers[sectionId]) {
        sectionHandlers[sectionId]();
    }
    
    console.log('✅ Switched to section:', sectionId);
}

function updateBottomNavForSection(sectionId) {
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    console.log('🔧 Setting up event listeners');
    
    // Auth form switching
    document.getElementById('showSignupFromLogin')?.addEventListener('click', showSignupForm);
    document.getElementById('showLoginFromSignup')?.addEventListener('click', showLoginForm);
    
    // Form submissions
    document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
    document.getElementById('signupFormElement')?.addEventListener('submit', handleSignup);
    document.getElementById('profileForm')?.addEventListener('submit', updateProfile);
    
    // Dropdown menu
    document.addEventListener('click', function(e) {
        if (e.target.id === 'dropdownLoginBtn' || e.target.closest('#dropdownLoginBtn')) {
            e.preventDefault();
            showLoginForm();
        }
        
        if (e.target.id === 'dropdownSignupBtn' || e.target.closest('#dropdownSignupBtn')) {
            e.preventDefault();
            showSignupForm();
        }
        
        if (e.target.id === 'dropdownLogoutBtn' || e.target.closest('#dropdownLogoutBtn')) {
            e.preventDefault();
            handleLogout();
        }
        
        if (e.target.closest('[data-section="profile"]')) {
            e.preventDefault();
            switchSection('profile');
        }
    });
    
    // Bottom navigation
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            if (!currentUser) {
                showNotification('Please log in to access this section', 'error');
                showLoginForm();
                return;
            }
            const section = this.getAttribute('data-section');
            switchSection(section);
        });
    });
    
    // Feature cards navigation
    document.querySelectorAll('.feature-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            if (!currentUser) {
                showNotification('Please log in first', 'error');
                showLoginForm();
                return;
            }
            switchSection(section);
        });
    });
    
    // Password toggle
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('loginPassword');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }
    
    const toggleSignupPassword = document.getElementById('toggleSignupPassword');
    if (toggleSignupPassword) {
        toggleSignupPassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('signupPassword');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }
    
    // Profile picture upload
    document.getElementById('profilePictureUpload')?.addEventListener('click', function() {
        document.getElementById('profilePictureInput').click();
    });
    
    document.getElementById('profilePictureInput')?.addEventListener('change', uploadProfilePicture);
    
    // Modal buttons
    document.getElementById('saveNoteBtn')?.addEventListener('click', saveNote);
    document.getElementById('saveAssignmentBtn')?.addEventListener('click', saveAssignment);
    document.getElementById('savePastQuestionBtn')?.addEventListener('click', savePastQuestion);
    document.getElementById('joinCourseBtn')?.addEventListener('click', joinCourse);
    
    // Discussion message sending
    document.getElementById('sendDiscussionMessageBtn')?.addEventListener('click', sendDiscussionMessage);
    document.getElementById('discussionMessageInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendDiscussionMessage();
        }
    });
}

// ==================== USER PROFILE MANAGEMENT ====================
async function loadUserProfile() {
    if (!currentUser || !supabase) return;
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                await createUserProfile();
                return;
            }
            throw error;
        }
        
        currentUser.profile = data;
        updateProfileUI();
    } catch (error) {
        console.error('Profile load error:', error);
        await createUserProfile();
    }
}

async function createUserProfile() {
    try {
        const userData = currentUser.user_metadata || {};
        const { data, error } = await supabase.from('profiles').insert([{
            id: currentUser.id,
            name: userData.name || currentUser.email?.split('@')[0] || 'User',
            email: currentUser.email,
            level: userData.level || '100L',
            department: userData.department || 'General',
            created_at: new Date().toISOString()
        }]).select().single();
        
        if (error) throw error;
        currentUser.profile = data;
        updateProfileUI();
    } catch (error) {
        console.error('Profile creation error:', error);
        currentUser.profile = {
            id: currentUser.id,
            name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User',
            email: currentUser.email,
            level: currentUser.user_metadata?.level || '100L',
            department: currentUser.user_metadata?.department || 'General'
        };
        updateProfileUI();
    }
}

function updateProfileUI() {
    if (!currentUser || !currentUser.profile) return;
    
    const profile = currentUser.profile;
    
    // Update dashboard welcome
    const welcomeUser = document.getElementById('welcomeUser');
    if (welcomeUser) welcomeUser.textContent = profile.name;
    
    // Update profile page
    const profileName = document.getElementById('profileName');
    const profileLevel = document.getElementById('profileLevel');
    const profileDepartment = document.getElementById('profileDepartment');
    const profileEmail = document.getElementById('profileEmail');
    const profilePicture = document.getElementById('profilePicture');
    
    if (profileName) profileName.textContent = profile.name;
    if (profileLevel) profileLevel.textContent = profile.level;
    if (profileDepartment) profileDepartment.textContent = profile.department;
    if (profileEmail) profileEmail.textContent = currentUser.email;
    
    if (profilePicture && profile.profile_picture) {
        profilePicture.src = profile.profile_picture;
        profilePicture.style.display = 'block';
    }
    
    // Update edit form
    const editName = document.getElementById('editName');
    const editLevel = document.getElementById('editLevel');
    const editDepartment = document.getElementById('editDepartment');
    const editEmail = document.getElementById('editEmail');
    
    if (editName) editName.value = profile.name;
    if (editLevel) editLevel.value = profile.level;
    if (editDepartment) editDepartment.value = profile.department;
    if (editEmail) editEmail.value = currentUser.email;
    
    // Update dropdown
    const dropdownUserName = document.getElementById('dropdownUserName');
    if (dropdownUserName) dropdownUserName.textContent = profile.name;
}

async function loadUserProfileData() {
    await loadUserProfile();
    await loadUserContributions();
    await loadContributionBadges();
    await loadRecentActivity();
}

async function loadUserContributions() {
    if (!currentUser || !supabase) return;
    
    try {
        const [notesResult, assignmentsResult, pastQuestionsResult] = await Promise.allSettled([
            supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
            supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
            supabase.from('past_questions').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id)
        ]);
        
        const notesCount = notesResult.status === 'fulfilled' ? (notesResult.value.count || 0) : 0;
        const assignmentsCount = assignmentsResult.status === 'fulfilled' ? (assignmentsResult.value.count || 0) : 0;
        const pastQuestionsCount = pastQuestionsResult.status === 'fulfilled' ? (pastQuestionsResult.value.count || 0) : 0;
        
        // Update profile page
        const myNotesCount = document.getElementById('myNotesCount');
        const myAssignmentsCount = document.getElementById('myAssignmentsCount');
        const myPastQuestionsCount = document.getElementById('myPastQuestionsCount');
        
        if (myNotesCount) myNotesCount.textContent = notesCount;
        if (myAssignmentsCount) myAssignmentsCount.textContent = assignmentsCount;
        if (myPastQuestionsCount) myPastQuestionsCount.textContent = pastQuestionsCount;
        
        // Update dashboard
        const dashboardNotesCount = document.getElementById('dashboardNotesCount');
        const dashboardAssignmentsCount = document.getElementById('dashboardAssignmentsCount');
        const dashboardQuestionsCount = document.getElementById('dashboardQuestionsCount');
        
        if (dashboardNotesCount) dashboardNotesCount.textContent = notesCount;
        if (dashboardAssignmentsCount) dashboardAssignmentsCount.textContent = assignmentsCount;
        if (dashboardQuestionsCount) dashboardQuestionsCount.textContent = pastQuestionsCount;
        
    } catch (error) {
        console.error('Error loading user contributions:', error);
    }
}

async function loadContributionBadges() {
    if (!currentUser || !supabase) return;
    
    try {
        const badgesContainer = document.getElementById('contributionBadges');
        if (!badgesContainer) return;
        
        const [notesResult, assignmentsResult, pastQuestionsResult] = await Promise.allSettled([
            supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
            supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
            supabase.from('past_questions').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id)
        ]);
        
        const notesCount = notesResult.status === 'fulfilled' ? (notesResult.value.count || 0) : 0;
        const assignmentsCount = assignmentsResult.status === 'fulfilled' ? (assignmentsResult.value.count || 0) : 0;
        const pastQuestionsCount = pastQuestionsResult.status === 'fulfilled' ? (pastQuestionsResult.value.count || 0) : 0;
        
        const totalContributions = notesCount + assignmentsCount + pastQuestionsCount;
        
        let badgeLevel = 1;
        if (totalContributions >= 20) badgeLevel = 5;
        else if (totalContributions >= 15) badgeLevel = 4;
        else if (totalContributions >= 10) badgeLevel = 3;
        else if (totalContributions >= 5) badgeLevel = 2;
        
        const badgeNames = {
            1: 'New Contributor',
            2: 'Active Contributor',
            3: 'Pro Contributor',
            4: 'Expert Contributor',
            5: 'Master Contributor'
        };
        
        badgesContainer.innerHTML = `
            <div class="badge-item">
                <i class="fas fa-trophy"></i>
                ${badgeNames[badgeLevel]}
            </div>
            <div class="badge-item" style="background: linear-gradient(135deg, #00bcd4, #0097a7);">
                <i class="fas fa-file-alt"></i>
                ${totalContributions} Uploads
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading contribution badges:', error);
    }
}

async function loadRecentActivity() {
    if (!currentUser || !supabase) return;
    
    try {
        const container = document.getElementById('recentActivityContent');
        if (!container) return;
        
        // Get recent notes, assignments, and past questions
        const [notesResult, assignmentsResult, pastQuestionsResult] = await Promise.allSettled([
            supabase.from('notes').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('assignments').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('past_questions').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(5)
        ]);
        
        const notes = notesResult.status === 'fulfilled' ? notesResult.value : [];
        const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];
        const pastQuestions = pastQuestionsResult.status === 'fulfilled' ? pastQuestionsResult.value : [];
        
        // Combine and sort by date
        const allActivities = [
            ...notes.map(note => ({ ...note, type: 'note' })),
            ...assignments.map(assignment => ({ ...assignment, type: 'assignment' })),
            ...pastQuestions.map(pq => ({ ...pq, type: 'past_question' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
        
        if (allActivities.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-history fa-2x mb-3"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = allActivities.map(activity => `
            <div class="list-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="list-item-title">
                            <i class="fas ${activity.type === 'note' ? 'fa-sticky-note' : activity.type === 'assignment' ? 'fa-tasks' : 'fa-file-alt'} me-2"></i>
                            ${escapeHtml(activity.title)}
                        </div>
                        <div class="list-item-meta">
                            ${activity.course} • ${formatDate(activity.created_at)}
                        </div>
                    </div>
                    <span class="badge ${activity.type === 'note' ? 'bg-primary' : activity.type === 'assignment' ? 'bg-success' : 'bg-warning'}">
                        ${activity.type === 'note' ? 'Note' : activity.type === 'assignment' ? 'Assignment' : 'Past Question'}
                    </span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        const container = document.getElementById('recentActivityContent');
        if (container) {
            container.innerHTML = '<p class="text-danger">Error loading recent activity</p>';
        }
    }
}

async function updateProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('editName').value;
    const level = document.getElementById('editLevel').value;
    const department = document.getElementById('editDepartment').value;
    const updateProfileBtn = document.getElementById('updateProfileBtn');
    const updateProfileBtnText = document.getElementById('updateProfileBtnText');
    
    if (!name || !level || !department) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        setButtonLoading(updateProfileBtn, updateProfileBtnText, true);
        
        const { error } = await supabase
            .from('profiles')
            .update({
                name: name,
                level: level,
                department: department
            })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        await loadUserProfile();
        showNotification('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile: ' + error.message, 'error');
    } finally {
        setButtonLoading(updateProfileBtn, updateProfileBtnText, false);
    }
}

async function uploadProfilePicture(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should be less than 5MB', 'error');
        return;
    }
    
    try {
        showProgressOverlay('Uploading profile picture...');
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}/profile-picture.${fileExt}`;
        
        // Try to upload to notes bucket first
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('notes')
            .upload(fileName, file, { upsert: true });
        
        if (uploadError) {
            // Try assignments bucket if notes fails
            const { data: uploadData2, error: uploadError2 } = await supabase.storage
                .from('assignments')
                .upload(fileName, file, { upsert: true });
            
            if (uploadError2) throw uploadError2;
        }
        
        const { data: { publicUrl } } = supabase.storage
            .from('notes')
            .getPublicUrl(fileName);
        
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ profile_picture: publicUrl })
            .eq('id', currentUser.id);
        
        if (updateError) throw updateError;
        
        const profilePicture = document.getElementById('profilePicture');
        if (profilePicture) {
            profilePicture.src = publicUrl;
            profilePicture.style.display = 'block';
        }
        
        if (currentUser.profile) {
            currentUser.profile.profile_picture = publicUrl;
        }
        
        showNotification('Profile picture updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        showNotification('Failed to upload profile picture: ' + error.message, 'error');
    } finally {
        hideProgressOverlay();
    }
}

// ==================== DASHBOARD FUNCTIONS ====================
async function loadDashboardData() {
    await loadRecentNotes();
    await loadUpcomingAssignments();
    await loadUserContributions();
}

async function loadRecentNotes() {
    const container = document.getElementById('recentNotesContent');
    if (!container || !supabase) return;
    
    try {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-sticky-note fa-2x mb-3"></i>
                    <p>No notes yet</p>
                    <button class="btn btn-sm btn-primary mt-2" data-bs-toggle="modal" data-bs-target="#addNoteModal">
                        Add Your First Note
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.map(note => `
            <div class="list-item">
                <div class="list-item-title">${escapeHtml(note.title)}</div>
                <div class="list-item-meta">${escapeHtml(note.course)} • ${formatDate(note.created_at)}</div>
                <div class="list-item-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="previewFile('${note.file_url}', '${note.file_type}', '${note.file_name || 'File'}', 'notes')">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent notes:', error);
        container.innerHTML = '<p class="text-danger">Error loading notes</p>';
    }
}

async function loadUpcomingAssignments() {
    const container = document.getElementById('upcomingAssignmentsContent');
    if (!container || !supabase) return;
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .gte('due_date', today)
            .order('due_date', { ascending: true })
            .limit(5);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-tasks fa-2x mb-3"></i>
                    <p>No upcoming assignments</p>
                    <p class="small">All caught up!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.map(assignment => {
            const dueDate = new Date(assignment.due_date);
            const today = new Date();
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let priorityClass = 'bg-success';
            if (daysUntilDue <= 1) priorityClass = 'bg-danger';
            else if (daysUntilDue <= 3) priorityClass = 'bg-warning';
            
            return `
                <div class="list-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="list-item-title">${escapeHtml(assignment.title)}</div>
                            <div class="list-item-meta">${escapeHtml(assignment.course)}</div>
                        </div>
                        <span class="badge ${priorityClass}">
                            ${daysUntilDue === 0 ? 'Today' : daysUntilDue === 1 ? 'Tomorrow' : `${daysUntilDue}d`}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading upcoming assignments:', error);
        container.innerHTML = '<p class="text-danger">Error loading assignments</p>';
    }
}

// ==================== NOTES MANAGEMENT ====================
async function loadNotes() {
    const container = document.getElementById('notesContent');
    if (!container || !supabase) return;
    
    try {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allNotes = data || [];
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-sticky-note fa-4x text-muted mb-4"></i>
                    <h4>No Notes Yet</h4>
                    <p class="text-muted mb-4">Start by sharing your first lecture note with classmates</p>
                    <button class="btn btn-primary btn-lg" data-bs-toggle="modal" data-bs-target="#addNoteModal">
                        <i class="fas fa-plus me-2"></i>Add Your First Note
                    </button>
                </div>
            `;
            return;
        }
        
        const userIds = [...new Set(data.map(note => note.user_id))];
        const userProfiles = {};
        
        await Promise.all(
            userIds.map(async (userId) => {
                userProfiles[userId] = await getUserProfile(userId);
            })
        );
        
        container.innerHTML = data.map(note => {
            const userProfile = userProfiles[note.user_id] || { name: 'Unknown User' };
            const initials = getInitials(userProfile.name);
            
            return `
                <div class="list-item" data-item-id="${note.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                                <div class="user-avatar-small me-3">
                                    ${userProfile.profile_picture ? 
                                        `<img src="${userProfile.profile_picture}" alt="${userProfile.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                                        initials
                                    }
                                </div>
                                <div>
                                    <div class="list-item-title">${escapeHtml(note.title)}</div>
                                    <div class="list-item-meta">
                                        By <span class="text-primary fw-bold">${escapeHtml(userProfile.name)}</span> • 
                                        ${escapeHtml(note.course)} • ${formatDate(note.created_at)}
                                    </div>
                                </div>
                            </div>
                            
                            ${note.description ? `
                                <div class="note-description mt-3 p-3 bg-light rounded">
                                    <p class="mb-0">${escapeHtml(note.description)}</p>
                                </div>
                            ` : ''}
                            
                            ${note.file_url ? `
                                <div class="file-attachment mt-3">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div class="file-info">
                                            <i class="fas fa-paperclip me-2 text-primary"></i>
                                            <span class="file-name fw-medium">${note.file_name || 'Attached file'}</span>
                                        </div>
                                        <div class="file-actions">
                                            <button class="btn btn-sm btn-outline-primary me-2" onclick="previewFile('${note.file_url}', '${note.file_type}', '${note.file_name || 'File'}', 'notes')">
                                                <i class="fas fa-eye me-1"></i>Preview
                                            </button>
                                            <button class="btn btn-sm btn-outline-success" onclick="downloadFile('${note.file_url}', '${note.file_name || 'download'}')">
                                                <i class="fas fa-download me-1"></i>Download
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        ${note.user_id === currentUser?.id ? `
                            <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteNote('${note.id}')" title="Delete Note">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading notes:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <h5>Error loading notes</h5>
                <p class="mb-0">${error.message}</p>
            </div>
        `;
    }
}

async function saveNote() {
    const title = document.getElementById('noteTitle').value;
    const course = document.getElementById('noteCourse').value;
    const description = document.getElementById('noteDescription').value;
    const noteFilesInput = document.getElementById('noteFiles');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const saveNoteBtnText = document.getElementById('saveNoteBtnText');
    
    if (!title || !course || !noteFilesInput) return;
    
    if (!title.trim()) {
        showNotification('Please enter a note title', 'error');
        document.getElementById('noteTitle').focus();
        return;
    }
    
    if (!course.trim()) {
        showNotification('Please enter a course', 'error');
        document.getElementById('noteCourse').focus();
        return;
    }
    
    if (!noteFilesInput.files.length) {
        showNotification('Please select a file to upload', 'error');
        return;
    }
    
    try {
        setButtonLoading(saveNoteBtn, saveNoteBtnText, true);
        
        const file = noteFilesInput.files[0];
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File size must be less than 10MB');
        }
        
        const fileData = await uploadFileToStorage(file, 'notes', currentUser.id);
        
        const noteData = {
            title: title.trim(),
            course: course.trim(),
            description: description.trim(),
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            file_url: fileData.url,
            file_name: fileData.name,
            file_type: fileData.type
        };
        
        const { error } = await supabase.from('notes').insert([noteData]);
        
        if (error) throw error;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addNoteModal'));
        if (modal) modal.hide();
        
        document.getElementById('addNoteForm').reset();
        document.getElementById('noteFilesPreview').innerHTML = '';
        
        showNotification('Note saved successfully!', 'success');
        loadNotes();
        loadDashboardData();
        
    } catch (error) {
        console.error('Error saving note:', error);
        showNotification('Error saving note: ' + error.message, 'error');
    } finally {
        setButtonLoading(saveNoteBtn, saveNoteBtnText, false);
    }
}

async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
        showProgressOverlay('Deleting note...');
        
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        showNotification('Note deleted successfully', 'success');
        loadNotes();
        loadUserContributions();
        
    } catch (error) {
        console.error('Error deleting note:', error);
        showNotification('Error deleting note: ' + error.message, 'error');
    } finally {
        hideProgressOverlay();
    }
}

// ==================== ASSIGNMENTS MANAGEMENT ====================
async function loadAssignments() {
    const container = document.getElementById('assignmentsContent');
    if (!container || !supabase) return;
    
    try {
        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .order('due_date', { ascending: true });
        
        if (error) throw error;
        
        allAssignments = data || [];
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-tasks fa-4x text-muted mb-4"></i>
                    <h4>No Assignments Yet</h4>
                    <p class="text-muted mb-4">Track your assignments and deadlines here</p>
                    <button class="btn btn-primary btn-lg" data-bs-toggle="modal" data-bs-target="#addAssignmentModal">
                        <i class="fas fa-plus me-2"></i>Add Your First Assignment
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.map(assignment => {
            const dueDate = new Date(assignment.due_date);
            const today = new Date();
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let priorityClass = 'bg-success';
            let priorityText = 'Low';
            if (daysUntilDue <= 1) {
                priorityClass = 'bg-danger';
                priorityText = 'High';
            } else if (daysUntilDue <= 3) {
                priorityClass = 'bg-warning';
                priorityText = 'Medium';
            }
            
            return `
                <div class="list-item" data-item-id="${assignment.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="list-item-title">${escapeHtml(assignment.title)}</div>
                            <div class="list-item-meta">
                                ${escapeHtml(assignment.course)} • Due: ${formatDate(assignment.due_date)}
                                <span class="badge ${priorityClass} ms-2">${priorityText}</span>
                            </div>
                            
                            ${assignment.description ? `
                                <div class="note-description mt-3 p-3 bg-light rounded">
                                    <p class="mb-0">${escapeHtml(assignment.description)}</p>
                                </div>
                            ` : ''}
                            
                            ${assignment.file_url ? `
                                <div class="file-attachment mt-3">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div class="file-info">
                                            <i class="fas fa-paperclip me-2 text-primary"></i>
                                            <span class="file-name fw-medium">${assignment.file_name || 'Attached file'}</span>
                                        </div>
                                        <div class="file-actions">
                                            <button class="btn btn-sm btn-outline-primary me-2" onclick="previewFile('${assignment.file_url}', '${assignment.file_type}', '${assignment.file_name || 'File'}', 'assignments')">
                                                <i class="fas fa-eye me-1"></i>Preview
                                            </button>
                                            <button class="btn btn-sm btn-outline-success" onclick="downloadFile('${assignment.file_url}', '${assignment.file_name || 'download'}')">
                                                <i class="fas fa-download me-1"></i>Download
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        ${assignment.user_id === currentUser?.id ? `
                            <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteAssignment('${assignment.id}')" title="Delete Assignment">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading assignments:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <h5>Error loading assignments</h5>
                <p class="mb-0">${error.message}</p>
            </div>
        `;
    }
}

async function saveAssignment() {
    const title = document.getElementById('assignmentTitle').value;
    const course = document.getElementById('assignmentCourse').value;
    const description = document.getElementById('assignmentDescription').value;
    const dueDate = document.getElementById('assignmentDueDate').value;
    const priority = document.getElementById('assignmentPriority').value;
    const assignmentFilesInput = document.getElementById('assignmentFiles');
    const saveAssignmentBtn = document.getElementById('saveAssignmentBtn');
    const saveAssignmentBtnText = document.getElementById('saveAssignmentBtnText');
    
    if (!title || !course || !assignmentFilesInput) return;
    
    if (!title.trim()) {
        showNotification('Please enter an assignment title', 'error');
        document.getElementById('assignmentTitle').focus();
        return;
    }
    
    if (!course.trim()) {
        showNotification('Please enter a course', 'error');
        document.getElementById('assignmentCourse').focus();
        return;
    }
    
    if (!assignmentFilesInput.files.length) {
        showNotification('Please select a file to upload', 'error');
        return;
    }
    
    try {
        setButtonLoading(saveAssignmentBtn, saveAssignmentBtnText, true);
        
        const file = assignmentFilesInput.files[0];
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File size must be less than 10MB');
        }
        
        const fileData = await uploadFileToStorage(file, 'assignments', currentUser.id);
        
        const assignmentData = {
            title: title.trim(),
            course: course.trim(),
            description: description.trim(),
            due_date: dueDate || null,
            priority: priority,
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            file_url: fileData.url,
            file_name: fileData.name,
            file_type: fileData.type
        };
        
        const { error } = await supabase.from('assignments').insert([assignmentData]);
        
        if (error) throw error;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addAssignmentModal'));
        if (modal) modal.hide();
        
        document.getElementById('addAssignmentForm').reset();
        document.getElementById('assignmentFilesPreview').innerHTML = '';
        
        showNotification('Assignment saved successfully!', 'success');
        loadAssignments();
        loadDashboardData();
        
    } catch (error) {
        console.error('Error saving assignment:', error);
        showNotification('Error saving assignment: ' + error.message, 'error');
    } finally {
        setButtonLoading(saveAssignmentBtn, saveAssignmentBtnText, false);
    }
}

async function deleteAssignment(assignmentId) {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    
    try {
        showProgressOverlay('Deleting assignment...');
        
        const { error } = await supabase
            .from('assignments')
            .delete()
            .eq('id', assignmentId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        showNotification('Assignment deleted successfully', 'success');
        loadAssignments();
        loadUserContributions();
        
    } catch (error) {
        console.error('Error deleting assignment:', error);
        showNotification('Error deleting assignment: ' + error.message, 'error');
    } finally {
        hideProgressOverlay();
    }
}

// ==================== PAST QUESTIONS MANAGEMENT ====================
async function loadPastQuestions() {
    const container = document.getElementById('pastQuestionsContent');
    if (!container || !supabase) return;
    
    try {
        const { data, error } = await supabase
            .from('past_questions')
            .select('*')
            .order('year', { ascending: false });
        
        if (error) throw error;
        
        allPastQuestions = data || [];
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-file-alt fa-4x text-muted mb-4"></i>
                    <h4>No Past Questions Yet</h4>
                    <p class="text-muted mb-4">Share past exam questions to help your classmates</p>
                    <button class="btn btn-primary btn-lg" data-bs-toggle="modal" data-bs-target="#addPastQuestionModal">
                        <i class="fas fa-plus me-2"></i>Add Your First Past Question
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.map(pq => {
            return `
                <div class="list-item" data-item-id="${pq.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="list-item-title">${escapeHtml(pq.title)}</div>
                            <div class="list-item-meta">
                                ${escapeHtml(pq.course)} • Year: ${pq.year}
                                ${pq.semester ? ` • Semester ${pq.semester}` : ''}
                            </div>
                            
                            ${pq.description ? `
                                <div class="note-description mt-3 p-3 bg-light rounded">
                                    <p class="mb-0">${escapeHtml(pq.description)}</p>
                                </div>
                            ` : ''}
                            
                            ${pq.file_url ? `
                                <div class="file-attachment mt-3">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div class="file-info">
                                            <i class="fas fa-paperclip me-2 text-primary"></i>
                                            <span class="file-name fw-medium">${pq.file_name || 'Attached file'}</span>
                                        </div>
                                        <div class="file-actions">
                                            <button class="btn btn-sm btn-outline-primary me-2" onclick="previewFile('${pq.file_url}', '${pq.file_type}', '${pq.file_name || 'File'}', 'past-questions')">
                                                <i class="fas fa-eye me-1"></i>Preview
                                            </button>
                                            <button class="btn btn-sm btn-outline-success" onclick="downloadFile('${pq.file_url}', '${pq.file_name || 'download'}')">
                                                <i class="fas fa-download me-1"></i>Download
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        ${pq.user_id === currentUser?.id ? `
                            <button class="btn btn-sm btn-outline-danger ms-2" onclick="deletePastQuestion('${pq.id}')" title="Delete Past Question">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading past questions:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <h5>Error loading past questions</h5>
                <p class="mb-0">${error.message}</p>
            </div>
        `;
    }
}

async function savePastQuestion() {
    const title = document.getElementById('pastQuestionTitle').value;
    const course = document.getElementById('pastQuestionCourse').value;
    const description = document.getElementById('pastQuestionDescription').value;
    const year = document.getElementById('pastQuestionYear').value;
    const semester = document.getElementById('pastQuestionSemester').value;
    const pastQuestionFileInput = document.getElementById('pastQuestionFile');
    const savePastQuestionBtn = document.getElementById('savePastQuestionBtn');
    const savePastQuestionBtnText = document.getElementById('savePastQuestionBtnText');
    
    if (!title || !course || !year || !pastQuestionFileInput) return;
    
    if (!title.trim()) {
        showNotification('Please enter a title', 'error');
        document.getElementById('pastQuestionTitle').focus();
        return;
    }
    
    if (!course.trim()) {
        showNotification('Please enter a course', 'error');
        document.getElementById('pastQuestionCourse').focus();
        return;
    }
    
    if (!year) {
        showNotification('Please enter a year', 'error');
        document.getElementById('pastQuestionYear').focus();
        return;
    }
    
    if (!pastQuestionFileInput.files.length) {
        showNotification('Please select a file to upload', 'error');
        return;
    }
    
    try {
        setButtonLoading(savePastQuestionBtn, savePastQuestionBtnText, true);
        
        const file = pastQuestionFileInput.files[0];
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File size must be less than 10MB');
        }
        
        const fileData = await uploadFileToStorage(file, 'past-questions', currentUser.id);
        
        const pastQuestionData = {
            title: title.trim(),
            course: course.trim(),
            description: description.trim(),
            year: year,
            semester: semester || null,
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            file_url: fileData.url,
            file_name: fileData.name,
            file_type: fileData.type
        };
        
        const { error } = await supabase.from('past_questions').insert([pastQuestionData]);
        
        if (error) throw error;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addPastQuestionModal'));
        if (modal) modal.hide();
        
        document.getElementById('addPastQuestionForm').reset();
        document.getElementById('pastQuestionFilePreview').innerHTML = '';
        
        showNotification('Past question saved successfully!', 'success');
        loadPastQuestions();
        loadUserContributions();
        
    } catch (error) {
        console.error('Error saving past question:', error);
        showNotification('Error saving past question: ' + error.message, 'error');
    } finally {
        setButtonLoading(savePastQuestionBtn, savePastQuestionBtnText, false);
    }
}

async function deletePastQuestion(pastQuestionId) {
    if (!confirm('Are you sure you want to delete this past question?')) return;
    
    try {
        showProgressOverlay('Deleting past question...');
        
        const { error } = await supabase
            .from('past_questions')
            .delete()
            .eq('id', pastQuestionId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        showNotification('Past question deleted successfully', 'success');
        loadPastQuestions();
        loadUserContributions();
        
    } catch (error) {
        console.error('Error deleting past question:', error);
        showNotification('Error deleting past question: ' + error.message, 'error');
    } finally {
        hideProgressOverlay();
    }
}

// ==================== DISCUSSION GROUPS ====================
async function loadDiscussionCourses() {
    const container = document.getElementById('courseList');
    if (!container || !supabase) return;
    
    try {
        // Get unique courses from notes, assignments, and past questions
        const [notesResult, assignmentsResult, pastQuestionsResult] = await Promise.allSettled([
            supabase.from('notes').select('course').neq('course', ''),
            supabase.from('assignments').select('course').neq('course', ''),
            supabase.from('past_questions').select('course').neq('course', '')
        ]);
        
        const courses = new Set();
        
        if (notesResult.status === 'fulfilled' && notesResult.value.data) {
            notesResult.value.data.forEach(item => courses.add(item.course.trim()));
        }
        
        if (assignmentsResult.status === 'fulfilled' && assignmentsResult.value.data) {
            assignmentsResult.value.data.forEach(item => courses.add(item.course.trim()));
        }
        
        if (pastQuestionsResult.status === 'fulfilled' && pastQuestionsResult.value.data) {
            pastQuestionsResult.value.data.forEach(item => courses.add(item.course.trim()));
        }
        
        allCourses = Array.from(courses).sort();
        
        if (allCourses.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-book fa-2x mb-3"></i>
                    <p>No courses found</p>
                    <p class="small">Add notes, assignments, or past questions to create course discussions</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = allCourses.map(course => `
            <div class="course-item" onclick="selectCourse('${course}')">
                <div class="course-name">${escapeHtml(course)}</div>
                <div class="course-meta">
                    <span><i class="fas fa-users"></i> 0 online</span>
                    <span><i class="fas fa-comment"></i> 0 messages</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading courses:', error);
        container.innerHTML = '<p class="text-danger">Error loading courses</p>';
    }
}

function selectCourse(courseName) {
    console.log('🎓 Selecting course:', courseName);
    
    currentCourse = courseName;
    
    // Update UI
    document.querySelectorAll('.course-item').forEach(item => {
        item.classList.remove('active');
        if (item.querySelector('.course-name').textContent === courseName) {
            item.classList.add('active');
        }
    });
    
    document.getElementById('discussionCourseTitle').textContent = courseName;
    document.getElementById('discussionCourseInfo').textContent = 'Course Discussion';
    document.getElementById('discussionInput').style.display = 'block';
    
    loadDiscussionMessages(courseName);
    setupDiscussionSubscription(courseName);
}

async function loadDiscussionMessages(courseName) {
    const container = document.getElementById('discussionMessages');
    if (!container || !supabase) return;
    
    try {
        // For now, we'll use the messages table for discussion
        // In a real implementation, you'd have a separate table for course discussions
        const { data, error } = await supabase
            .from('messages')
            .select('*, profiles(name)')
            .eq('course', courseName)
            .order('created_at', { ascending: true })
            .limit(50);
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="empty-discussion">
                    <i class="fas fa-comments"></i>
                    <h4>No Messages Yet</h4>
                    <p>Be the first to start the discussion for ${courseName}!</p>
                </div>
            `;
            return;
        }
        
        data.forEach(message => {
            const isSent = message.sender_id === currentUser?.id;
            const messageElement = createDiscussionMessage(message, isSent);
            container.appendChild(messageElement);
        });
        
        scrollToBottom(container);
        
    } catch (error) {
        console.error('Error loading discussion messages:', error);
        container.innerHTML = '<p class="text-danger">Error loading messages</p>';
    }
}

function createDiscussionMessage(message, isSent) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const senderName = message.profiles?.name || 'Unknown User';
    const initials = getInitials(senderName);
    const avatarColor = getColorFromName(senderName);
    
    messageDiv.innerHTML = `
        <div class="message-avatar" style="background-color: ${avatarColor}">${initials}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">${escapeHtml(senderName)}</span>
                <span class="message-time">${formatTime(message.created_at)}</span>
            </div>
            <div class="message-text">${escapeHtml(message.content)}</div>
        </div>
    `;
    
    return messageDiv;
}

async function sendDiscussionMessage() {
    const input = document.getElementById('discussionMessageInput');
    const button = document.getElementById('sendDiscussionMessageBtn');
    
    if (!input || !currentCourse || !currentUser || !supabase) return;
    
    const content = input.value.trim();
    if (!content) return;
    
    try {
        button.disabled = true;
        
        const messageData = {
            content: content,
            sender_id: currentUser.id,
            course: currentCourse,
            message_type: 'text',
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabase.from('messages').insert([messageData]);
        
        if (error) throw error;
        
        input.value = '';
        input.focus();
        
        // The real-time subscription will handle displaying the new message
        
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Error sending message: ' + error.message, 'error');
    } finally {
        button.disabled = false;
    }
}

async function joinCourse() {
    const courseCode = document.getElementById('courseCode').value;
    const courseName = document.getElementById('courseName').value;
    
    if (!courseCode.trim() || !courseName.trim()) {
        showNotification('Please enter both course code and name', 'error');
        return;
    }
    
    const fullCourseName = `${courseCode} - ${courseName}`;
    
    // Add to courses list
    if (!allCourses.includes(fullCourseName)) {
        allCourses.push(fullCourseName);
        allCourses.sort();
        
        // Update UI
        loadDiscussionCourses();
        
        // Select the new course
        setTimeout(() => {
            selectCourse(fullCourseName);
        }, 100);
    } else {
        selectCourse(fullCourseName);
    }
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('joinCourseModal'));
    if (modal) modal.hide();
    
    document.getElementById('joinCourseForm').reset();
    
    showNotification(`Joined ${fullCourseName} discussion`, 'success');
}

function setupDiscussionSubscription(courseName) {
    if (!supabase || !currentUser) return;
    
    // Remove existing subscription
    if (discussionSubscription) {
        supabase.removeChannel(discussionSubscription);
    }
    
    discussionSubscription = supabase
        .channel(`discussion:${courseName}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `course=eq.${courseName}`
            },
            async (payload) => {
                console.log('💬 New discussion message:', payload);
                
                // Don't display if it's our own message (already displayed)
                if (payload.new.sender_id === currentUser.id) return;
                
                // Get sender profile
                const senderProfile = await getUserProfile(payload.new.sender_id);
                
                // Create and display message
                const container = document.getElementById('discussionMessages');
                if (container) {
                    const emptyState = container.querySelector('.empty-discussion');
                    if (emptyState) emptyState.remove();
                    
                    const messageElement = createDiscussionMessage({
                        ...payload.new,
                        profiles: senderProfile
                    }, false);
                    
                    container.appendChild(messageElement);
                    scrollToBottom(container);
                    
                    // Play notification sound
                    playNotificationSound();
                }
            }
        )
        .subscribe();
}

function scrollToBottom(container) {
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

function playNotificationSound() {
    // Simple notification sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.log('Sound playback not available');
    }
}

// ==================== FILE MANAGEMENT ====================
function setupFileUploadHandlers() {
    // Note file upload
    const noteUploadArea = document.getElementById('noteUploadArea');
    const noteFilesInput = document.getElementById('noteFiles');
    
    if (noteUploadArea && noteFilesInput) {
        noteUploadArea.addEventListener('click', () => noteFilesInput.click());
        noteUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            noteUploadArea.style.borderColor = '#2196f3';
            noteUploadArea.style.backgroundColor = '#e3f2fd';
        });
        noteUploadArea.addEventListener('dragleave', () => {
            noteUploadArea.style.borderColor = '';
            noteUploadArea.style.backgroundColor = '';
        });
        noteUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            noteUploadArea.style.borderColor = '';
            noteUploadArea.style.backgroundColor = '';
            if (e.dataTransfer.files.length) {
                noteFilesInput.files = e.dataTransfer.files;
                handleFileUpload({ target: noteFilesInput }, 'noteFilesPreview');
            }
        });
        
        noteFilesInput.addEventListener('change', (e) => handleFileUpload(e, 'noteFilesPreview'));
    }
    
    // Assignment file upload
    const assignmentUploadArea = document.getElementById('assignmentUploadArea');
    const assignmentFilesInput = document.getElementById('assignmentFiles');
    
    if (assignmentUploadArea && assignmentFilesInput) {
        assignmentUploadArea.addEventListener('click', () => assignmentFilesInput.click());
        assignmentFilesInput.addEventListener('change', (e) => handleFileUpload(e, 'assignmentFilesPreview'));
    }
    
    // Past question file upload
    const pastQuestionUploadArea = document.getElementById('pastQuestionUploadArea');
    const pastQuestionFileInput = document.getElementById('pastQuestionFile');
    
    if (pastQuestionUploadArea && pastQuestionFileInput) {
        pastQuestionUploadArea.addEventListener('click', () => pastQuestionFileInput.click());
        pastQuestionFileInput.addEventListener('change', (e) => handleFileUpload(e, 'pastQuestionFilePreview', true));
    }
}

function handleFileUpload(event, previewContainerId, singleFile = false) {
    const files = event.target.files;
    const previewContainer = document.getElementById(previewContainerId);
    
    if (!previewContainer) return;
    
    if (singleFile && files.length > 1) {
        showNotification('Please select only one file', 'error');
        event.target.value = '';
        return;
    }
    
    previewContainer.innerHTML = '';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > 10 * 1024 * 1024) {
            showNotification(`File "${file.name}" is too large. Maximum size is 10MB.`, 'error');
            continue;
        }
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-preview-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <i class="fas ${getFileIcon(file.type)} file-icon"></i>
                <div>
                    <div class="file-name-preview">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
            <div class="file-remove" onclick="removeFile(this, '${event.target.id}')">
                <i class="fas fa-times"></i>
            </div>
        `;
        
        previewContainer.appendChild(fileItem);
    }
}

function getFileIcon(fileType) {
    if (fileType.includes('pdf')) return 'fa-file-pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fa-file-excel';
    if (fileType.includes('image')) return 'fa-file-image';
    if (fileType.includes('zip') || fileType.includes('rar')) return 'fa-file-archive';
    return 'fa-file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function removeFile(element, inputId) {
    const fileItem = element.closest('.file-preview-item');
    fileItem.remove();
    
    const fileInput = document.getElementById(inputId);
    if (fileInput) {
        fileInput.value = '';
    }
}

async function uploadFileToStorage(file, bucketName, userId) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        console.log('📤 Uploading file to:', bucketName, fileName);
        
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
        
        console.log('✅ File uploaded successfully:', publicUrl);
        
        return {
            url: publicUrl,
            name: file.name,
            type: file.type
        };
        
    } catch (error) {
        console.error('❌ Upload error:', error);
        throw error;
    }
}

// ==================== SEARCH FUNCTIONALITY ====================
function setupSearchFunctionality() {
    // Notes search
    const notesSearch = document.getElementById('notesSearch');
    if (notesSearch) {
        notesSearch.addEventListener('input', function() {
            searchNotes(this.value);
        });
    }
    
    // Assignments search
    const assignmentsSearch = document.getElementById('assignmentsSearch');
    if (assignmentsSearch) {
        assignmentsSearch.addEventListener('input', function() {
            searchAssignments(this.value);
        });
    }
    
    // Past questions search
    const pastQuestionsSearch = document.getElementById('pastQuestionsSearch');
    if (pastQuestionsSearch) {
        pastQuestionsSearch.addEventListener('input', function() {
            searchPastQuestions(this.value);
        });
    }
    
    // Community search
    const communitySearch = document.getElementById('communitySearch');
    if (communitySearch) {
        communitySearch.addEventListener('input', function() {
            searchCommunity(this.value);
        });
    }
}

function searchNotes(query) {
    const resultsContainer = document.getElementById('notesSearchResults');
    if (!resultsContainer) return;
    
    if (!query.trim()) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    const filteredNotes = allNotes.filter(note => 
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.course.toLowerCase().includes(query.toLowerCase()) ||
        (note.description && note.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    if (filteredNotes.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No notes found</div>';
    } else {
        resultsContainer.innerHTML = filteredNotes.map(note => `
            <div class="search-result-item" onclick="scrollToNote('${note.id}')">
                <div class="search-result-title">${escapeHtml(note.title)}</div>
                <div class="search-result-meta">${escapeHtml(note.course)} • ${formatDate(note.created_at)}</div>
            </div>
        `).join('');
    }
    
    resultsContainer.style.display = 'block';
}

function searchAssignments(query) {
    const resultsContainer = document.getElementById('assignmentsSearchResults');
    if (!resultsContainer) return;
    
    if (!query.trim()) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    const filteredAssignments = allAssignments.filter(assignment => 
        assignment.title.toLowerCase().includes(query.toLowerCase()) ||
        assignment.course.toLowerCase().includes(query.toLowerCase()) ||
        (assignment.description && assignment.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    if (filteredAssignments.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No assignments found</div>';
    } else {
        resultsContainer.innerHTML = filteredAssignments.map(assignment => `
            <div class="search-result-item" onclick="scrollToAssignment('${assignment.id}')">
                <div class="search-result-title">${escapeHtml(assignment.title)}</div>
                <div class="search-result-meta">${escapeHtml(assignment.course)} • Due: ${formatDate(assignment.due_date)}</div>
            </div>
        `).join('');
    }
    
    resultsContainer.style.display = 'block';
}

function searchPastQuestions(query) {
    const resultsContainer = document.getElementById('pastQuestionsSearchResults');
    if (!resultsContainer) return;
    
    if (!query.trim()) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    const filteredPastQuestions = allPastQuestions.filter(pq => 
        pq.title.toLowerCase().includes(query.toLowerCase()) ||
        pq.course.toLowerCase().includes(query.toLowerCase()) ||
        pq.year.toString().includes(query) ||
        (pq.description && pq.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    if (filteredPastQuestions.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No past questions found</div>';
    } else {
        resultsContainer.innerHTML = filteredPastQuestions.map(pq => `
            <div class="search-result-item" onclick="scrollToPastQuestion('${pq.id}')">
                <div class="search-result-title">${escapeHtml(pq.title)}</div>
                <div class="search-result-meta">${escapeHtml(pq.course)} • ${pq.year}</div>
            </div>
        `).join('');
    }
    
    resultsContainer.style.display = 'block';
}

function searchCommunity(query) {
    // Implement community search
    console.log('Searching community for:', query);
}

function scrollToNote(noteId) {
    const noteElement = document.querySelector(`[data-item-id="${noteId}"]`);
    if (noteElement) {
        noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        noteElement.classList.add('new-item');
        setTimeout(() => noteElement.classList.remove('new-item'), 1000);
    }
    
    // Hide search results
    document.getElementById('notesSearchResults').style.display = 'none';
    document.getElementById('notesSearch').value = '';
}

function scrollToAssignment(assignmentId) {
    const assignmentElement = document.querySelector(`[data-item-id="${assignmentId}"]`);
    if (assignmentElement) {
        assignmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        assignmentElement.classList.add('new-item');
        setTimeout(() => assignmentElement.classList.remove('new-item'), 1000);
    }
    
    document.getElementById('assignmentsSearchResults').style.display = 'none';
    document.getElementById('assignmentsSearch').value = '';
}

function scrollToPastQuestion(pastQuestionId) {
    const pastQuestionElement = document.querySelector(`[data-item-id="${pastQuestionId}"]`);
    if (pastQuestionElement) {
        pastQuestionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pastQuestionElement.classList.add('new-item');
        setTimeout(() => pastQuestionElement.classList.remove('new-item'), 1000);
    }
    
    document.getElementById('pastQuestionsSearchResults').style.display = 'none';
    document.getElementById('pastQuestionsSearch').value = '';
}

// ==================== COMMUNITY FUNCTIONS ====================
async function loadCommunityUsers() {
    const container = document.getElementById('communityUsersContent');
    if (!container || !supabase) return;
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-users fa-4x text-muted mb-4"></i>
                    <h4>No Community Members</h4>
                    <p class="text-muted">Be the first to join!</p>
                </div>
            `;
            return;
        }
        
        // Update stats
        document.getElementById('totalUsers').textContent = data.length;
        document.getElementById('activeToday').textContent = Math.floor(data.length * 0.3); // Simulate 30% active
        
        // Find top contributor (simulated)
        document.getElementById('topContributor').textContent = data[0]?.name?.split(' ')[0] || 'None';
        
        container.innerHTML = data.map(user => {
            if (user.id === currentUser?.id) return '';
            
            const initials = getInitials(user.name);
            const contributions = Math.floor(Math.random() * 50); // Simulated for now
            
            return `
                <div class="community-user-card">
                    <div class="user-avatar-small" style="background-color: ${getColorFromName(user.name)}">
                        ${user.profile_picture ? 
                            `<img src="${user.profile_picture}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                            initials
                        }
                    </div>
                    <div class="user-info-small">
                        <div class="user-name-small">${escapeHtml(user.name)}</div>
                        <div class="user-meta-small">${user.level} • ${user.department}</div>
                        <div class="user-stats-small">
                            <span><i class="fas fa-file-alt"></i> ${contributions} contributions</span>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewUserProfile('${user.id}', '${escapeHtml(user.name)}')">
                        View Profile
                    </button>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading community users:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <h5>Error loading community</h5>
                <p class="mb-0">${error.message}</p>
            </div>
        `;
    }
}

// ==================== USER PROFILE VIEWING ====================
async function getUserProfile(userId) {
    if (userProfilesCache.has(userId)) {
        return userProfilesCache.get(userId);
    }
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        userProfilesCache.set(userId, data);
        return data;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return { 
            name: 'Unknown User', 
            level: 'N/A', 
            department: 'N/A',
            profile_picture: null
        };
    }
}

async function viewUserProfile(userId, userName) {
    console.log('👤 Viewing user profile:', userId);
    
    if (userId === currentUser?.id) {
        switchSection('profile');
        return;
    }
    
    try {
        showProgressOverlay('Loading profile...');
        
        const userProfile = await getUserProfile(userId);
        
        // Create a simple profile view modal
        const modalHtml = `
            <div class="modal fade" id="userProfileModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">User Profile</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="text-center mb-4">
                                <div class="profile-picture-container" style="width: 100px; height: 100px; margin: 0 auto 15px;">
                                    ${userProfile.profile_picture ? 
                                        `<img src="${userProfile.profile_picture}" alt="${userProfile.name}" class="profile-picture" style="width: 100%; height: 100%;">` :
                                        `<div class="user-initials" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: ${getColorFromName(userProfile.name)}; color: white; font-size: 1.5rem; font-weight: bold; border-radius: 50%;">${getInitials(userProfile.name)}</div>`
                                    }
                                </div>
                                <h3>${escapeHtml(userProfile.name)}</h3>
                                <p class="text-muted">${userProfile.level} • ${userProfile.department}</p>
                                <p class="text-muted">${userProfile.email}</p>
                            </div>
                            
                            <div class="row text-center">
                                <div class="col-4">
                                    <h4>0</h4>
                                    <p class="text-muted">Notes</p>
                                </div>
                                <div class="col-4">
                                    <h4>0</h4>
                                    <p class="text-muted">Assignments</p>
                                </div>
                                <div class="col-4">
                                    <h4>0</h4>
                                    <p class="text-muted">Questions</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="messageUserFromProfile('${userId}', '${escapeHtml(userProfile.name)}')">
                                <i class="fas fa-comment me-2"></i>Message
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('userProfileModal');
        if (existingModal) existingModal.remove();
        
        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('userProfileModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        showNotification('Error loading user profile', 'error');
    } finally {
        hideProgressOverlay();
    }
}

function messageUserFromProfile(userId, userName) {
    // Close profile modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('userProfileModal'));
    if (modal) modal.hide();
    
    // Switch to discussion section
    switchSection('discussion');
    
    // Create a private course for messaging (simplified)
    const privateCourse = `Private: ${userName}`;
    currentCourse = privateCourse;
    
    // Update UI
    setTimeout(() => {
        document.getElementById('discussionCourseTitle').textContent = `Message: ${userName}`;
        document.getElementById('discussionCourseInfo').textContent = 'Private Conversation';
        document.getElementById('discussionInput').style.display = 'block';
        
        // Load messages for this private conversation
        loadPrivateMessages(userId);
    }, 500);
}

async function loadPrivateMessages(userId) {
    // Simplified private messaging implementation
    const container = document.getElementById('discussionMessages');
    if (container) {
        container.innerHTML = `
            <div class="empty-discussion">
                <i class="fas fa-comments"></i>
                <h4>Start a Conversation</h4>
                <p>Send your first message to start the conversation</p>
            </div>
        `;
    }
}

// ==================== FILE PREVIEW ====================
function previewFile(fileUrl, fileType, fileName, section) {
    currentPreviewFile = {
        url: fileUrl,
        name: fileName,
        type: fileType
    };
    
    const modal = new bootstrap.Modal(document.getElementById('filePreviewModal'));
    const title = document.getElementById('filePreviewTitle');
    const content = document.getElementById('filePreviewContent');
    
    if (title) title.textContent = `Preview: ${fileName}`;
    
    content.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading preview...</span>
            </div>
            <p class="mt-2">Loading preview...</p>
        </div>
    `;
    
    modal.show();
    
    setTimeout(() => {
        loadFilePreview(fileUrl, fileType, fileName, content);
    }, 500);
}

function loadFilePreview(fileUrl, fileType, fileName, contentContainer) {
    if (fileType.includes('image')) {
        contentContainer.innerHTML = `
            <img src="${fileUrl}" class="img-fluid" style="max-height: 70vh; border-radius: 8px;" alt="${fileName}" onerror="handlePreviewError(this)">
        `;
    } else if (fileType.includes('pdf')) {
        contentContainer.innerHTML = `
            <iframe src="${fileUrl}" width="100%" height="500px" style="border: none; border-radius: 8px;" onload="handleIframeLoad(this)" onerror="handleIframeError(this)"></iframe>
        `;
    } else {
        contentContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-file fa-3x text-muted mb-3"></i>
                <h5>Preview not available</h5>
                <p class="text-muted">Please download the file to view its contents</p>
                <button class="btn btn-primary mt-3" onclick="downloadFile('${fileUrl}', '${fileName}')">
                    <i class="fas fa-download me-2"></i>Download File
                </button>
            </div>
        `;
    }
}

function handlePreviewError(imgElement) {
    const container = imgElement.parentElement;
    container.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
            <h5>Unable to load preview</h5>
            <p class="text-muted">The image could not be loaded</p>
            <button class="btn btn-primary mt-3" onclick="downloadFile('${currentPreviewFile?.url}', '${currentPreviewFile?.name}')">
                <i class="fas fa-download me-2"></i>Download File
            </button>
        </div>
    `;
}

function handleIframeLoad(iframe) {
    console.log('Iframe loaded successfully');
}

function handleIframeError(iframe) {
    const container = iframe.parentElement;
    container.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
            <h5>Failed to load document</h5>
            <p class="text-muted">The document could not be loaded</p>
            <button class="btn btn-primary mt-3" onclick="downloadFile('${currentPreviewFile?.url}', '${currentPreviewFile?.name}')">
                <i class="fas fa-download me-2"></i>Download File
            </button>
        </div>
    `;
}

function downloadFile(fileUrl, fileName) {
    if (!fileUrl) {
        showNotification('Download URL not available', 'error');
        return;
    }
    
    try {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'download';
        link.target = '_blank';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Download started', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Download failed: ' + error.message, 'error');
    }
}

// ==================== REAL-TIME SUBSCRIPTIONS ====================
function setupRealtimeSubscriptions() {
    console.log('🔔 Setting up real-time subscriptions');
    
    removeAllSubscriptions();
    setupNotesSubscription();
    setupAssignmentsSubscription();
    setupPastQuestionsSubscription();
}

function setupNotesSubscription() {
    if (!supabase || !currentUser) return;
    
    notesSubscription = supabase
        .channel('notes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'notes'
            },
            (payload) => {
                console.log('📝 Notes update:', payload);
                
                const activeSection = document.querySelector('.section.active');
                if (activeSection && activeSection.id === 'notes') {
                    loadNotes();
                }
                if (activeSection && activeSection.id === 'dashboard') {
                    loadRecentNotes();
                    loadUserContributions();
                }
            }
        )
        .subscribe();
}

function setupAssignmentsSubscription() {
    if (!supabase || !currentUser) return;
    
    assignmentsSubscription = supabase
        .channel('assignments')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'assignments'
            },
            (payload) => {
                console.log('📋 Assignments update:', payload);
                
                const activeSection = document.querySelector('.section.active');
                if (activeSection && activeSection.id === 'assignments') {
                    loadAssignments();
                }
                if (activeSection && activeSection.id === 'dashboard') {
                    loadUpcomingAssignments();
                    loadUserContributions();
                }
            }
        )
        .subscribe();
}

function setupPastQuestionsSubscription() {
    if (!supabase || !currentUser) return;
    
    pastQuestionsSubscription = supabase
        .channel('past_questions')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'past_questions'
            },
            (payload) => {
                console.log('📚 Past questions update:', payload);
                
                const activeSection = document.querySelector('.section.active');
                if (activeSection && activeSection.id === 'past-questions') {
                    loadPastQuestions();
                }
                if (activeSection && activeSection.id === 'dashboard') {
                    loadUserContributions();
                }
            }
        )
        .subscribe();
}

function removeAllSubscriptions() {
    console.log('🔕 Removing all subscriptions');
    
    if (notesSubscription) supabase.removeChannel(notesSubscription);
    if (assignmentsSubscription) supabase.removeChannel(assignmentsSubscription);
    if (pastQuestionsSubscription) supabase.removeChannel(pastQuestionsSubscription);
    if (discussionSubscription) supabase.removeChannel(discussionSubscription);
    
    notesSubscription = null;
    assignmentsSubscription = null;
    pastQuestionsSubscription = null;
    discussionSubscription = null;
}

function initializeRealtimeMonitoring() {
    // Monitor connection status
    setInterval(() => {
        // Check if we need to re-establish connections
        console.log('🔄 Monitoring real-time connections');
    }, 30000);
}

// ==================== PWA FUNCTIONS ====================
function initializePWA() {
    console.log('📱 Initializing PWA features');
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('❌ Service Worker registration failed:', error);
            });
    }
    
    // Handle install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button after 5 seconds
        setTimeout(() => {
            showInstallPromotion();
        }, 5000);
    });
    
    window.addEventListener('appinstalled', () => {
        console.log('🏠 CampusNote installed successfully');
        deferredPrompt = null;
    });
}

function showInstallPromotion() {
    const installButton = document.createElement('button');
    installButton.className = 'btn btn-success position-fixed';
    installButton.style.cssText = `
        bottom: 100px;
        right: 20px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        padding: 12px 20px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    installButton.innerHTML = '<i class="fas fa-download"></i> Install App';
    installButton.onclick = installPWA;
    installButton.id = 'installButton';
    
    document.body.appendChild(installButton);
}

function installPWA() {
    if (!window.deferredPrompt) {
        showNotification('App installation not available', 'warning');
        return;
    }
    
    window.deferredPrompt.prompt();
    window.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('✅ User accepted the install prompt');
            showNotification('App installed successfully!', 'success');
        } else {
            console.log('❌ User dismissed the install prompt');
        }
        window.deferredPrompt = null;
        
        const installButton = document.getElementById('installButton');
        if (installButton) installButton.remove();
    });
}

// ==================== NETWORK DETECTION ====================
function setupNetworkDetection() {
    window.addEventListener('online', () => {
        console.log('🌐 Online - connection restored');
        showNotification('Connection restored', 'success');
        document.body.classList.remove('offline');
    });
    
    window.addEventListener('offline', () => {
        console.log('📴 Offline - connection lost');
        showNotification('You are currently offline', 'warning');
        document.body.classList.add('offline');
    });
    
    if (!navigator.onLine) {
        document.body.classList.add('offline');
        showNotification('You are currently offline', 'warning');
    }
}

// ==================== WINDOW EXPORTS ====================
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleLogout = handleLogout;
window.showLoginForm = showLoginForm;
window.showSignupForm = showSignupForm;
window.switchSection = switchSection;
window.viewUserProfile = viewUserProfile;
window.previewFile = previewFile;
window.downloadFile = downloadFile;
window.deleteNote = deleteNote;
window.deleteAssignment = deleteAssignment;
window.deletePastQuestion = deletePastQuestion;
window.selectCourse = selectCourse;
window.sendDiscussionMessage = sendDiscussionMessage;
window.removeFile = removeFile;
window.handleIframeLoad = handleIframeLoad;
window.handleIframeError = handleIframeError;
window.scrollToNote = scrollToNote;
window.scrollToAssignment = scrollToAssignment;
window.scrollToPastQuestion = scrollToPastQuestion;
window.messageUserFromProfile = messageUserFromProfile;
window.installPWA = installPWA;

console.log('🎉 CampusNote application loaded successfully!');