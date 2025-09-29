import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = 'https://nijpmtwihccpaqsiirva.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5panBtdHdpaGNjcGFxc2lpcnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTI3MjQsImV4cCI6MjA3NDcyODcyNH0.aepDRx4Ew0zHdS6HAOUi1C8NXdMXvX5cf5ScQyfrvCM';
const supabase = createClient(supabaseUrl, supabaseKey)

        // DOM Elements
        const sections = document.querySelectorAll('.section');
        const navLinks = document.querySelectorAll('.nav-link');
        const authSection = document.getElementById('auth-section');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const loginFormElement = document.getElementById('loginFormElement');
        const signupFormElement = document.getElementById('signupFormElement');
        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userDropdown = document.getElementById('userDropdown');
        const authButtons = document.getElementById('authButtons');
        const userName = document.getElementById('userName');
        const userInitials = document.getElementById('userInitials');
        const welcomeUser = document.getElementById('welcomeUser');
        
        // Initialize the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            console.log('CampusNote app initialized');
            setupNavigation();
            setupAuthEventListeners();
            
            // Test Supabase connection - MOVED HERE to ensure supabase is initialized
            testSupabaseConnection();
            checkAuthState();
        });

        // Test if Supabase is connected - MOVED AFTER initialization
        async function testSupabaseConnection() {
            try {
                const { data, error } = await supabase.from('profiles').select('count');
                if (error) {
                    console.log('Supabase connected but tables might not exist:', error.message);
                } else {
                    console.log('Supabase connected successfully!');
                }
            } catch (error) {
                console.log('Supabase connection test:', error.message);
            }
        }

        // Setup navigation
        function setupNavigation() {
            console.log('Setting up navigation...');
            
            document.querySelectorAll('.nav-link, [data-section]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetSection = link.getAttribute('data-section');
                    
                    if (targetSection) {
                        console.log('Navigating to:', targetSection);
                        
                        // Update active nav link
                        navLinks.forEach(navLink => {
                            navLink.classList.remove('active');
                        });
                        link.classList.add('active');
                        
                        // Show target section
                        sections.forEach(section => {
                            section.classList.remove('active');
                        });
                        
                        const targetElement = document.getElementById(targetSection);
                        if (targetElement) {
                            targetElement.classList.add('active');
                        } else {
                            console.error('Section not found:', targetSection);
                        }
                    }
                });
            });
            
            console.log('Navigation setup complete');
        }

        // Setup authentication event listeners
        function setupAuthEventListeners() {
            console.log('Setting up auth event listeners...');
            
            // Auth form toggling
            showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Show signup clicked');
                loginForm.style.display = 'none';
                signupForm.style.display = 'block';
            });

            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Show login clicked');
                signupForm.style.display = 'none';
                loginForm.style.display = 'block';
            });

            // Navigation auth buttons
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Login button clicked');
                authSection.classList.add('active');
                document.getElementById('dashboard').classList.remove('active');
                loginForm.style.display = 'block';
                signupForm.style.display = 'none';
                
                // Update navigation
                navLinks.forEach(navLink => navLink.classList.remove('active'));
                document.querySelector('[data-section="dashboard"]').classList.add('active');
            });

            signupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Signup button clicked');
                authSection.classList.add('active');
                document.getElementById('dashboard').classList.remove('active');
                signupForm.style.display = 'block';
                loginForm.style.display = 'none';
                
                // Update navigation
                navLinks.forEach(navLink => navLink.classList.remove('active'));
                document.querySelector('[data-section="dashboard"]').classList.add('active');
            });

            // Login form submission
            loginFormElement.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Login form submitted');
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                const loginError = document.getElementById('loginError');
                
                try {
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: email,
                        password: password
                    });
                    
                    if (error) throw error;
                    
                    // Login successful
                    loginError.style.display = 'none';
                    console.log('Login successful');
                } catch (error) {
                    console.error('Login error:', error);
                    loginError.textContent = error.message;
                    loginError.style.display = 'block';
                }
            });

            // Signup form submission
            signupFormElement.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Signup form submitted');
                const name = document.getElementById('signupName').value;
                const email = document.getElementById('signupEmail').value;
                const password = document.getElementById('signupPassword').value;
                const level = document.getElementById('signupLevel').value;
                const department = document.getElementById('signupDepartment').value;
                const signupError = document.getElementById('signupError');
                
                try {
                    const { data, error } = await supabase.auth.signUp({
                        email: email,
                        password: password,
                        options: {
                            data: {
                                full_name: name,
                                academic_level: level,
                                department: department
                            }
                        }
                    });
                    
                    if (error) throw error;
                    
                    // Signup successful
                    signupError.style.display = 'none';
                    alert('Account created successfully! Please check your email for verification.');
                    console.log('Signup successful');
                } catch (error) {
                    console.error('Signup error:', error);
                    signupError.textContent = error.message;
                    signupError.style.display = 'block';
                }
            });

            // Logout
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('Logout clicked');
                const { error } = await supabase.auth.signOut();
                if (error) console.error('Logout error:', error);
            });

            console.log('Auth event listeners setup complete');
        }

        // Check initial auth state
        async function checkAuthState() {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (session) {
                    console.log('User already logged in');
                    handleUserLoggedIn(session.user);
                } else {
                    console.log('No user logged in');
                    handleUserLoggedOut();
                }
            } catch (error) {
                console.log('Error checking auth state:', error);
                handleUserLoggedOut();
            }
        }

        // Auth state observer
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            
            if (session?.user) {
                handleUserLoggedIn(session.user);
            } else {
                handleUserLoggedOut();
            }
        });

        function handleUserLoggedIn(user) {
            console.log('User logged in:', user.id);
            authSection.classList.remove('active');
            document.getElementById('dashboard').classList.add('active');
            userDropdown.style.display = 'block';
            authButtons.style.display = 'none';
            
            // Update navigation
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            document.querySelector('[data-section="dashboard"]').classList.add('active');
            
            // Load user data
            loadUserProfile(user.id);
            loadUserContent(user.id);
        }

        function handleUserLoggedOut() {
            console.log('User logged out');
            authSection.classList.add('active');
            userDropdown.style.display = 'none';
            authButtons.style.display = 'flex';
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
            
            // Update navigation
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            document.querySelector('[data-section="dashboard"]').classList.remove('active');
        }

        // Load user profile
        async function loadUserProfile(userId) {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();
                
                if (error) throw error;
                
                if (data) {
                    displayUserInfo(data);
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            }
        }

        // Display user information
        function displayUserInfo(userData) {
            const name = userData.full_name || 'User';
            const level = userData.academic_level || 'Not set';
            const department = userData.department || 'Not set';
            const email = userData.email || '';
            
            // Get initials for avatar
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
            
            // Update UI elements
            userName.textContent = name;
            userInitials.textContent = initials;
            welcomeUser.textContent = `Hello, ${name}!`;
            
            // Update profile section
            document.getElementById('profileName').textContent = name;
            document.getElementById('profileLevel').textContent = level;
            document.getElementById('profileDepartment').textContent = department;
            document.getElementById('profileEmail').textContent = email;
            document.getElementById('profileAvatar').textContent = initials;
            
            // Set form values
            document.getElementById('editName').value = name;
            document.getElementById('editLevel').value = level;
            document.getElementById('editDepartment').value = department;
        }

        // Load user content from Supabase
        function loadUserContent(userId) {
            loadNotes(userId);
            loadAssignments(userId);
            loadPastQuestions(userId);
            loadDashboardData(userId);
        }

        // Basic data loading functions
        async function loadNotes(userId) {
            const notesContent = document.getElementById('notesContent');
            notesContent.innerHTML = '<div class="alert alert-info">Notes will load after database setup</div>';
        }

        async function loadAssignments(userId) {
            const assignmentsContent = document.getElementById('assignmentsContent');
            assignmentsContent.innerHTML = '<div class="alert alert-info">Assignments will load after database setup</div>';
        }

        async function loadPastQuestions(userId) {
            const pastQuestionsContent = document.getElementById('pastQuestionsContent');
            pastQuestionsContent.innerHTML = '<div class="alert alert-info">Past questions will load after database setup</div>';
        }

        async function loadDashboardData(userId) {
            const recentNotesContent = document.getElementById('recentNotesContent');
            const upcomingAssignmentsContent = document.getElementById('upcomingAssignmentsContent');
            
            recentNotesContent.innerHTML = '<p class="text-muted">No notes yet. Add your first note!</p>';
            upcomingAssignmentsContent.innerHTML = '<p class="text-muted">No upcoming assignments. Great job!</p>';
            
            document.getElementById('myNotesCount').textContent = '0';
            document.getElementById('myAssignmentsCount').textContent = '0';
            document.getElementById('myPastQuestionsCount').textContent = '0';
        }

        // Format date function
        function formatDate(dateString) {
            if (!dateString) return 'Unknown date';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }

        // Add basic versions of save functions for testing
        document.getElementById('saveNoteBtn').addEventListener('click', async () => {
            alert('Note saving will work after database setup. Make sure to replace Supabase credentials and run the SQL setup.');
        });

        document.getElementById('saveAssignmentBtn').addEventListener('click', async () => {
            alert('Assignment saving will work after database setup. Make sure to replace Supabase credentials and run the SQL setup.');
        });

        document.getElementById('savePastQuestionBtn').addEventListener('click', async () => {
            alert('Past question saving will work after database setup. Make sure to replace Supabase credentials and run the SQL setup.');
        });

        // Test function to verify everything is working
        window.testApp = function() {
            console.log('=== CampusNote Test ===');
            console.log('Supabase:', supabase ? 'Connected' : 'Not connected');
            console.log('Auth buttons:', authButtons ? 'Found' : 'Not found');
            console.log('Signup button:', signupBtn ? 'Found' : 'Not found');
            console.log('Login button:', loginBtn ? 'Found' : 'Not found');
            console.log('Navigation links:', navLinks.length);
            
            // Test navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                console.log('Nav link:', link.getAttribute('data-section'), link.textContent);
            });
            
            alert('Check browser console for test results');
        };
