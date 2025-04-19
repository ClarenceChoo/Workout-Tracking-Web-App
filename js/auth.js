// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// --- Firebase Configuration ---
// IMPORTANT: Consider using environment variables or a configuration file
// for sensitive keys in a real application, rather than hardcoding.
const firebaseConfig = {
  apiKey: "AIzaSyDPO_KiG5Xm4cbc2gEe7IxvwKELa-p5BFU",
  authDomain: "workout-app-3b408.firebaseapp.com",
  projectId: "workout-app-3b408",
  storageBucket: "workout-app-3b408.firebasestorage.app",
  messagingSenderId: "731171671055",
  appId: "1:731171671055:web:104c52fa12e20ef8cb277a",
  measurementId: "G-BHXSBFPZLH"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- DOM Element Selection ---
const loginForm     = document.getElementById("loginForm");
const signupForm    = document.getElementById("signupForm");
const resetForm     = document.getElementById("resetForm");
const allAuthForms  = document.querySelectorAll(".auth-form"); // Get all forms

const loginEmailInput    = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const signupEmailInput   = document.getElementById("signupEmail");
const signupPasswordInput = document.getElementById("signupPassword");
const resetEmailInput    = document.getElementById("resetEmail");

const loginErrorEl   = document.getElementById("loginError");
const signupErrorEl  = document.getElementById("signupError");
const resetErrorEl   = document.getElementById("resetError");
const resetInfoEl    = document.getElementById("resetInfo");

const showLoginBtn   = document.getElementById("showLogin");
const showSignupBtn  = document.getElementById("showSignup");
const showResetLink  = document.getElementById("showReset");
const backToLoginLink = document.getElementById("backToLogin");
const toggleButtons = [showLoginBtn, showSignupBtn]; // Group toggle buttons

// Password Policy Elements
const policyLengthEl  = document.getElementById("policy-length");
const policyNumberEl  = document.getElementById("policy-number");
const policySpecialEl = document.getElementById("policy-special");

// --- Utility Functions ---

/**
 * Hides all auth forms, shows the specified form, and updates toggle button active states.
 * @param {string} formIdToShow The ID of the form element to display.
 */
function showAuthForm(formIdToShow) {
  allAuthForms.forEach(form => form.classList.add("hidden"));
  const formToShow = document.getElementById(formIdToShow);
  if (formToShow) {
    formToShow.classList.remove("hidden");
  }

  toggleButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.target === formIdToShow);
  });

  [loginErrorEl, signupErrorEl, resetErrorEl, resetInfoEl].forEach(el => el.textContent = '');
}

/**
 * Updates the password policy list item based on validity.
 * @param {HTMLElement} policyElement The list item element.
 * @param {boolean} isValid Whether the policy condition is met.
 */
function updatePolicyVisual(policyElement, isValid) {
    policyElement.classList.toggle("valid", isValid);
    policyElement.classList.toggle("invalid", !isValid);
}

/**
 * Maps Firebase error codes to more user-friendly messages.
 * @param {Error} error The error object from Firebase.
 * @returns {string} A user-friendly error message.
 */
function mapFirebaseError(error) {
    console.error("Firebase Auth Error:", error); // Log the original error for debugging
    switch (error.code) {
        case 'auth/user-not-found':
            return 'No account found with that email address.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/email-already-in-use':
            return 'This email address is already registered. Please log in or use a different email.';
        case 'auth/weak-password':
            return 'Password is too weak. Please choose a stronger password.';
        case 'auth/missing-password':
             return 'Please enter your password.';
        case 'auth/invalid-credential':
             return 'Invalid email or password.'; // Generic message
        default:
            return error.message; // Fallback
    }
}

// --- Event Listeners ---

// Form Visibility Toggles
showLoginBtn.addEventListener("click", () => showAuthForm(showLoginBtn.dataset.target));
showSignupBtn.addEventListener("click", () => showAuthForm(showSignupBtn.dataset.target));
showResetLink.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm(showResetLink.dataset.target);
});
backToLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm(backToLoginLink.dataset.target);
});

// Password Policy Real-time Check
signupPasswordInput.addEventListener("input", (e) => {
  const password = e.target.value;
  updatePolicyVisual(policyLengthEl, password.length >= 8);
  updatePolicyVisual(policyNumberEl, /[0-9]/.test(password));
  updatePolicyVisual(policySpecialEl, /[!@#$%^&*]/.test(password));
});

// Sign Up Form Submission
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupErrorEl.textContent = "";
  const email = signupEmailInput.value;
  const password = signupPasswordInput.value;

  const policyRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
  if (!policyRegex.test(password)) {
    signupErrorEl.textContent = "Password does not meet all requirements.";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    signupErrorEl.textContent = "Account created! Check your inbox for a verification link.";
    signupForm.reset();
    // Optionally switch back to login view
    // showAuthForm("loginForm");
  } catch (error) {
    signupErrorEl.textContent = mapFirebaseError(error);
  }
});

// Login Form Submission
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginErrorEl.textContent = "";
  const email = loginEmailInput.value;
  const password = loginPasswordInput.value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
        loginErrorEl.textContent = "Please verify your email address first. Check your inbox.";
        await auth.signOut(); // Keep user signed out
        return;
    }
    // onAuthStateChanged handles redirect
  } catch (error) {
    loginErrorEl.textContent = mapFirebaseError(error);
  }
});

// Password Reset Form Submission
resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  resetErrorEl.textContent = "";
  resetInfoEl.textContent = "";
  const email = resetEmailInput.value;

  try {
    await sendPasswordResetEmail(auth, email);
    resetInfoEl.textContent = "Password reset link sent! Check your email.";
    resetForm.reset();
  } catch (error) {
    resetErrorEl.textContent = mapFirebaseError(error);
  }
});

// --- Authentication State Observer ---
onAuthStateChanged(auth, user => {
  if (user && user.emailVerified) { // Ensure user exists and is verified
    console.log("User logged in and verified:", user.uid);
    window.location.replace("index.html"); // Redirect to main app
  } else if (user && !user.emailVerified) {
    // User exists but hasn't verified email yet. Keep them on auth page.
    console.log("User logged in but email not verified:", user.uid);
    // Optionally show a specific message or keep the login form visible
    showAuthForm("loginForm"); // Ensure login form is shown
    // Display verification needed message if not already shown by login attempt
    if (!loginErrorEl.textContent.includes("verify your email")) {
         loginErrorEl.textContent = "Please check your inbox to verify your email address before logging in.";
    }
  }
   else {
    // User is signed out
    console.log("User logged out or not logged in.");
    // Ensure the login form is shown by default
    showAuthForm("loginForm");
  }
});

// --- Initial Setup ---
// The onAuthStateChanged listener above handles showing the correct
// form initially based on login state. If the user is not logged in,
// it defaults to showing the login form.