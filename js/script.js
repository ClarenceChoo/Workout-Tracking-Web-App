// Import Firebase Realtime Database functions
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

// Import Firebase Auth (already there, but good to list)
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";

// Import the core Firebase App function
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

// --- Firebase Initialization (from your HTML) ---
const firebaseConfig = {
  apiKey: "AIzaSyDPO_KiG5Xm4cbc2gEe7IxvwKELa-p5BFU", // Replace with your actual config if different
  authDomain: "workout-app-3b408.firebaseapp.com",   // Replace with your actual config if different
  projectId: "workout-app-3b408",                    // Replace with your actual config if different
  storageBucket: "workout-app-3b408.firebasestorage.app", // Replace with your actual config if different
  messagingSenderId: "731171671055",                 // Replace with your actual config if different
  appId: "1:731171671055:web:104c52fa12e20ef8cb277a", // Replace with your actual config if different
  measurementId: "G-BHXSBFPZLH",                     // Replace with your actual config if different
  databaseURL: "https://workout-app-3b408-default-rtdb.asia-southeast1.firebasedatabase.app" // Add your RTDB URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getDatabase(app); // Get Realtime Database instance

// --- Global Variables ---
let timerInterval = null;
let elapsedTime = 0;
let userUid = null; // Store the current user's UID

// ----- Days and Global Variables -----
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// DOM References
const daySelector = document.getElementById("daySelector");
const workoutForm = document.getElementById("workoutForm");        // Strength form
const cardioForm = document.getElementById("cardioForm");            // Cardio form
const workoutList = document.getElementById("workoutList");
const restDayCheckbox = document.getElementById("restDayCheckbox");

// Strength Edit Modal Elements
const strengthEditModal = document.getElementById("strengthEditModal");
const closeStrengthModal = document.getElementById("closeStrengthModal");
const modalStrengthExercise = document.getElementById("modalStrengthExercise");
const modalStrengthSets = document.getElementById("modalStrengthSets");
const modalStrengthReps = document.getElementById("modalStrengthReps");
const modalStrengthWeight = document.getElementById("modalStrengthWeight");
const modalStrengthSaveButton = document.getElementById("modalStrengthSaveButton");
const modalStrengthCancelButton = document.getElementById("modalStrengthCancelButton");

// Cardio Edit Modal Elements
const cardioEditModal = document.getElementById("cardioEditModal");
const closeCardioModal = document.getElementById("closeCardioModal");
const modalCardioExercise = document.getElementById("modalCardioExercise");
const modalCardioMinutes = document.getElementById("modalCardioMinutes");
const modalCardioSeconds = document.getElementById("modalCardioSeconds");
const modalCardioDistance = document.getElementById("modalCardioDistance");
const modalCardioSaveButton = document.getElementById("modalCardioSaveButton");
const modalCardioCancelButton = document.getElementById("modalCardioCancelButton");

// Toggle Buttons for Exercise Type
const strengthButton = document.getElementById("strengthBtn");
const cardioButton = document.getElementById("cardioBtn");

// Timer Modal and Elements
const openTimer = document.getElementById('openTimer');
const timerModal = document.getElementById('timerModal');
const closeTimer = document.getElementById('closeTimer');
const timerDisplay = document.getElementById('timerDisplay');
const toggleTimer = document.getElementById('toggleTimer');
const resetTimer = document.getElementById('resetTimer');

// Global state for editing
let currentEditKey = null; // Now storing Firebase key instead of index
let currentEditType = null; // 'strength' or 'cardio'

// Data structure: Will be populated from Firebase
// {
//   "Monday": {
//     "strength": { "-firebasekey1": { ... }, "-firebasekey2": { ... } }, // Firebase stores lists as objects with keys
//     "cardio": { "-firebasekey3": { ... } },
//     "isRestDay": false
//   },
//   ...
// }
// We will convert this to local arrays for rendering
let weeklyWorkouts = {};

// Default current selected day (using dayNames to match JS getDay() index)
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
let currentDay = dayNames[new Date().getDay()];

// ----- Authentication State Change Listener -----
onAuthStateChanged(auth, user => {
  if (user) {
    // User is signed in
    userUid = user.uid;
    console.log("User signed in:", userUid);

    // --- Load data from Firebase and set up listener ---
    const userWorkoutsRef = ref(db, 'users/' + userUid + '/weeklyWorkouts');
    onValue(userWorkoutsRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        // Data exists in Firebase, update local state
        weeklyWorkouts = data;
        // Ensure all days have strength and cardio arrays and isRestDay property
        daysOfWeek.forEach(day => {
          if (!weeklyWorkouts[day]) {
             weeklyWorkouts[day] = { strength: [], cardio: [], isRestDay: false };
          }
          if (!weeklyWorkouts[day].strength) {
            // Convert old 'workouts' array if it exists, otherwise initialize
            if (weeklyWorkouts[day].workouts) {
              weeklyWorkouts[day].strength = convertFirebaseObjectToArray(weeklyWorkouts[day].workouts); // Need helper
              delete weeklyWorkouts[day].workouts;
            } else {
               weeklyWorkouts[day].strength = [];
            }
          } else {
            // Ensure strength is an array (it comes as an object from Firebase if there are items)
             weeklyWorkouts[day].strength = convertFirebaseObjectToArray(weeklyWorkouts[day].strength); // Need helper
          }

          if (!weeklyWorkouts[day].cardio) {
             weeklyWorkouts[day].cardio = [];
          } else {
             // Ensure cardio is an array
             weeklyWorkouts[day].cardio = convertFirebaseObjectToArray(weeklyWorkouts[day].cardio); // Need helper
          }

          if (typeof weeklyWorkouts[day].isRestDay === 'undefined') {
            weeklyWorkouts[day].isRestDay = false;
          }
        });

      } else {
        // No data in Firebase for this user, initialize local state
        console.log("No data in Firebase, initializing locally.");
        daysOfWeek.forEach(day => {
          weeklyWorkouts[day] = {
            strength: [],
            cardio: [],
            isRestDay: false
          };
        });
        // Save the initial structure to Firebase for a new user
        set(userWorkoutsRef, weeklyWorkouts).catch(error => console.error("Error setting initial data:", error));
      }

      // After loading/initializing, perform daily reset check and render
      resetDoneStatusIfNewDay(); // This will save to Firebase if reset happens
      updateDaySelector();
      // Only show initial forms if not a rest day on load
      if (!weeklyWorkouts[currentDay].isRestDay) {
        showStrength(); // By default set to strength form
      } else {
         // If it's a rest day on load, hide forms/buttons
         workoutForm.style.display = 'none';
         cardioForm.style.display = 'none';
         strengthButton.style.display = 'none';
         cardioButton.style.display = 'none';
         openTimer.style.display = 'none';
      }
      renderWorkouts(); // Render the workouts based on the loaded data
    }, (error) => {
       console.error("Error loading data from Firebase:", error);
       // Optionally, display an error message to the user
    });


  } else {
    // User is signed out
    userUid = null;
    console.log("User signed out.");
    // Clear local data and redirect
    weeklyWorkouts = {}; // Clear data on sign out
    workoutList.innerHTML = ""; // Clear displayed workouts
    // You might want to stop the Firebase listener here if needed,
    // but the onAuthStateChanged redirect usually happens quickly.
    window.location.replace("login.html");
  }
});


// Helper function to convert Firebase object of objects to an array of objects
// Adds the Firebase key as a 'key' property to each object
function convertFirebaseObjectToArray(firebaseObject) {
  const array = [];
  if (firebaseObject) {
    Object.keys(firebaseObject).forEach(key => {
      const item = firebaseObject[key];
      item.key = key; // Add the Firebase key to the object
      array.push(item);
    });
  }
  return array;
}


// ----- Rendering Workouts -----
function renderWorkouts() {
  const dayData = weeklyWorkouts[currentDay];

  // Update rest day checkbox state
  restDayCheckbox.checked = dayData.isRestDay;

  // If it's a rest day, show a message and hide forms/buttons
  if(dayData.isRestDay) {
    workoutList.innerHTML = '<p>This is a rest day. Enjoy your break!</p>';
    workoutForm.style.display = 'none';
    cardioForm.style.display = 'none';
    strengthButton.style.display = 'none';
    cardioButton.style.display = 'none';
    openTimer.style.display = 'none';
  } else {
    // Show the toggle buttons and timer button when it's not a rest day
    strengthButton.style.display = 'inline-block';
    cardioButton.style.display = 'inline-block';
    openTimer.style.display = 'inline-block';

    // Show the correct form based on the active toggle
    workoutForm.style.display = strengthButton.classList.contains('active') ? 'flex' : 'none';
    cardioForm.style.display = cardioButton.classList.contains('active') ? 'flex' : 'none';

    workoutList.innerHTML = "";

    // Render Strength Workouts (using the array generated by convertFirebaseObjectToArray)
    dayData.strength.forEach((workout) => { // No index needed from loop, use workout.key
      const li = document.createElement("li");
      // Store the Firebase key and type on the list item
      li.setAttribute("data-key", workout.key);
      li.setAttribute("data-type", "strength"); // Add type attribute here for clarity
      li.innerHTML = `
        <span>
          <input type="checkbox" class="doneCheckbox" ${workout.done ? "checked" : ""} data-key="${workout.key}" data-type="strength">
          <strong>${workout.exercise}</strong> –
          <span class="sets">${workout.sets}</span> sets x
          <span class="reps">${workout.reps}</span> reps @
          <span class="weight">${workout.weight}</span> KG
        </span>
        <div class="workout-actions">
          <button class="editButton" data-key="${workout.key}" data-type="strength">Edit</button>
          <button class="deleteButton" data-key="${workout.key}" data-type="strength">Delete</button>
        </div>
      `;
      workoutList.appendChild(li);
    });

    // Render Cardio Workouts (using the array)
    dayData.cardio.forEach((workout) => { // No index needed from loop, use workout.key
      const li = document.createElement("li");
      // Store the Firebase key and type on the list item
      li.setAttribute("data-key", workout.key);
      li.setAttribute("data-type", "cardio"); // Add type attribute here for clarity
      li.innerHTML = `
        <span>
          <input type="checkbox" class="doneCheckbox" ${workout.done ? "checked" : ""} data-key="${workout.key}" data-type="cardio">
          <strong>${workout.exercise}</strong> –
          <span class="duration">${workout.minutes} minutes ${workout.seconds} seconds</span> @
          <span class="distance">${workout.distance}</span> km
        </span>
        <div class="workout-actions">
          <button class="editButton" data-key="${workout.key}" data-type="cardio">Edit</button>
          <button class="deleteButton" data-key="${workout.key}" data-type="cardio">Delete</button>
        </div>
      `;
      workoutList.appendChild(li);
    });
  }
}

// Update active day button appearance
function updateDaySelector() {
  const buttons = daySelector.querySelectorAll("button");
  buttons.forEach(button => {
    if (button.getAttribute("data-day") === currentDay) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

// ----- Initialization (Handled by onAuthStateChanged listener now) -----
// window.addEventListener("load", () => { ... moved into onAuthStateChanged });


// ----- Day Selector & Rest Day Toggle -----
daySelector.addEventListener("click", (e) => {
  if(e.target.tagName === "BUTTON") {
    currentDay = e.target.getAttribute("data-day");
    renderWorkouts(); // Render immediately based on updated currentDay
    updateDaySelector();
    // Adjust form/button visibility based on rest day status of the newly selected day
     if(weeklyWorkouts[currentDay].isRestDay) {
        workoutForm.style.display = 'none';
        cardioForm.style.display = 'none';
        strengthButton.style.display = 'none';
        cardioButton.style.display = 'none';
        openTimer.style.display = 'none';
     } else {
        strengthButton.style.display = 'inline-block';
        cardioButton.style.display = 'inline-block';
        openTimer.style.display = 'inline-block';
        // Re-show the correct form based on the *current* active toggle state
        if (strengthButton.classList.contains('active')) {
            showStrength();
        } else {
            showCardio();
        }
     }
  }
});

restDayCheckbox.addEventListener("change", function(e) {
  if (!userUid) return; // Ensure user is logged in

  const isRestDay = e.target.checked;
  // Update Firebase
  const restDayRef = ref(db, `users/${userUid}/weeklyWorkouts/${currentDay}/isRestDay`);
  set(restDayRef, isRestDay)
    .then(() => {
      console.log(`Rest day for ${currentDay} set to ${isRestDay} in Firebase.`);
      // The onValue listener will update the local weeklyWorkouts and re-render
    })
    .catch(error => console.error("Error setting rest day:", error));
});

// ----- Form Submissions -----
// Strength Form Submission
workoutForm.addEventListener("submit", function(e) {
  e.preventDefault();
  if (!userUid || weeklyWorkouts[currentDay].isRestDay) return; // Ensure user logged in and not rest day

  const exercise = document.getElementById("exercise").value;
  const sets = document.getElementById("sets").value;
  const reps = document.getElementById("reps").value;
  const weight = document.getElementById("weight").value;

  const newWorkout = {
    exercise,
    sets: parseInt(sets, 10), // Convert to number
    reps: parseInt(reps, 10), // Convert to number
    weight: parseFloat(weight), // Convert to number
    done: false
    // No 'type' needed here, it's determined by the list it's pushed to
  };

  // Push to Firebase under the current day's 'strength' list
  const strengthListRef = ref(db, `users/${userUid}/weeklyWorkouts/${currentDay}/strength`);
  push(strengthListRef, newWorkout)
    .then(() => {
      console.log("Strength workout added to Firebase.");
      workoutForm.reset();
      // The onValue listener will update the local weeklyWorkouts and re-render
    })
    .catch(error => console.error("Error adding strength workout:", error));
});

// Cardio Form Submission
cardioForm.addEventListener("submit", function(e) {
  e.preventDefault();
  if (!userUid || weeklyWorkouts[currentDay].isRestDay) return; // Ensure user logged in and not rest day

  const exercise = document.getElementById("cardioExercise").value;
  const minutes = document.getElementById("cardioDurationMinutes").value;
  const seconds = document.getElementById("cardioDurationSeconds").value;
  const distance = document.getElementById("cardioDistance").value;

  const newCardioWorkout = {
    exercise,
    minutes: parseInt(minutes, 10),
    seconds: parseInt(seconds, 10),
    distance: parseFloat(distance),
    done: false
  };

  // Push to Firebase under the current day's 'cardio' list
  const cardioListRef = ref(db, `users/${userUid}/weeklyWorkouts/${currentDay}/cardio`);
  push(cardioListRef, newCardioWorkout)
    .then(() => {
      console.log("Cardio workout added to Firebase.");
      cardioForm.reset();
       // The onValue listener will update the local weeklyWorkouts and re-render
    })
    .catch(error => console.error("Error adding cardio workout:", error));
});

// ----- Workout List Event Delegation for Edit, Delete, & Done -----
workoutList.addEventListener("click", function(e) {
  const target = e.target;
  // Get the Firebase key and type from the button/checkbox's data attributes
  const key = target.getAttribute("data-key");
  const type = target.getAttribute("data-type"); // 'strength' or 'cardio'

  if (!userUid || !key || !type) return; // Ensure user logged in and attributes exist

  const itemRef = ref(db, `users/${userUid}/weeklyWorkouts/${currentDay}/${type}/${key}`);

  // Toggle done status
  if(target.classList.contains("doneCheckbox")) {
    const isDone = target.checked;
    update(itemRef, { done: isDone })
      .then(() => console.log("Workout done status updated in Firebase."))
      .catch(error => console.error("Error updating done status:", error));
    return; // Stop further processing for this click
  }

  // Editing: open the appropriate modal with current data
  if(target.classList.contains("editButton")) {
    currentEditKey = key;
    currentEditType = type;

    // Find the workout in the local array using the key
    let workoutToEdit;
    if (type === 'strength') {
       workoutToEdit = weeklyWorkouts[currentDay].strength.find(w => w.key === key);
    } else if (type === 'cardio') {
       workoutToEdit = weeklyWorkouts[currentDay].cardio.find(w => w.key === key);
    }

    if (!workoutToEdit) {
       console.error("Workout not found for editing!");
       return;
    }

    if(type === 'strength') {
      modalStrengthExercise.value = workoutToEdit.exercise;
      modalStrengthSets.value = workoutToEdit.sets;
      modalStrengthReps.value = workoutToEdit.reps;
      modalStrengthWeight.value = workoutToEdit.weight;
      strengthEditModal.style.display = "block";
    } else if (type === 'cardio') {
      modalCardioExercise.value = workoutToEdit.exercise;
      modalCardioMinutes.value = workoutToEdit.minutes;
      modalCardioSeconds.value = workoutToEdit.seconds;
      modalCardioDistance.value = workoutToEdit.distance;
      cardioEditModal.style.display = "block";
    }
    return; // Stop further processing
  }

  // Deletion
  if(target.classList.contains("deleteButton")) {
    if (confirm("Are you sure you want to delete this workout?")) {
      remove(itemRef)
        .then(() => console.log("Workout deleted from Firebase."))
        .catch(error => console.error("Error deleting workout:", error));
       // The onValue listener will update the local weeklyWorkouts and re-render
    }
    return; // Stop further processing
  }
});

// ----- Strength Modal Event Handlers -----
modalStrengthSaveButton.addEventListener("click", () => {
  if (!userUid || !currentEditKey || currentEditType !== 'strength') return;

  const updatedWorkoutData = {
    exercise: modalStrengthExercise.value,
    sets: parseInt(modalStrengthSets.value, 10),
    reps: parseInt(modalStrengthReps.value, 10),
    weight: parseFloat(modalStrengthWeight.value)
  };

  const itemRef = ref(db, `users/${userUid}/weeklyWorkouts/${currentDay}/strength/${currentEditKey}`);
  update(itemRef, updatedWorkoutData)
    .then(() => {
      console.log("Strength workout updated in Firebase.");
      strengthEditModal.style.display = "none";
      currentEditKey = null;
      currentEditType = null;
       // The onValue listener will update the local weeklyWorkouts and re-render
    })
    .catch(error => console.error("Error updating strength workout:", error));
});

modalStrengthCancelButton.addEventListener("click", () => {
  strengthEditModal.style.display = "none";
  currentEditKey = null;
  currentEditType = null;
});

closeStrengthModal.addEventListener("click", () => {
  strengthEditModal.style.display = "none";
  currentEditKey = null;
  currentEditType = null;
});

// ----- Cardio Modal Event Handlers -----
modalCardioSaveButton.addEventListener("click", () => {
  if (!userUid || !currentEditKey || currentEditType !== 'cardio') return;

  const updatedCardioData = {
    exercise: modalCardioExercise.value,
    minutes: parseInt(modalCardioMinutes.value, 10),
    seconds: parseInt(modalCardioSeconds.value, 10),
    distance: parseFloat(modalCardioDistance.value)
  };

  const itemRef = ref(db, `users/${userUid}/weeklyWorkouts/${currentDay}/cardio/${currentEditKey}`);
  update(itemRef, updatedCardioData)
    .then(() => {
      console.log("Cardio workout updated in Firebase.");
      cardioEditModal.style.display = "none";
      currentEditKey = null;
      currentEditType = null;
      // The onValue listener will update the local weeklyWorkouts and re-render
    })
    .catch(error => console.error("Error updating cardio workout:", error));
});

modalCardioCancelButton.addEventListener("click", () => {
  cardioEditModal.style.display = "none";
  currentEditKey = null;
  currentEditType = null;
});

closeCardioModal.addEventListener("click", () => {
  cardioEditModal.style.display = "none";
  currentEditKey = null;
  currentEditType = null;
});

// ----- Optional: Close Modals When Clicking Outside -----
window.addEventListener("click", (e) => {
  if(e.target === strengthEditModal) {
    strengthEditModal.style.display = "none";
    currentEditKey = null;
    currentEditType = null;
  }
  if(e.target === cardioEditModal) {
    cardioEditModal.style.display = "none";
    currentEditKey = null;
    currentEditType = null;
  }
});

// ----- Reset 'done' Status if a New Day has Started -----
function resetDoneStatusIfNewDay() {
  if (!userUid) return; // Ensure user is logged in

  const today = new Date().toLocaleDateString();
  const lastDate = localStorage.getItem(`lastWorkoutDate_${userUid}`); // Use user-specific local storage key

  if (lastDate !== today) {
    console.log("New day detected, resetting 'done' statuses.");
    // Reset done status in the local data structure
    daysOfWeek.forEach(day => {
      if (weeklyWorkouts[day]) {
        if (weeklyWorkouts[day].strength) {
          weeklyWorkouts[day].strength.forEach(workout => workout.done = false);
        }
        if (weeklyWorkouts[day].cardio) {
          weeklyWorkouts[day].cardio.forEach(workout => workout.done = false);
        }
      }
    });

    // Save the entire updated structure back to Firebase
    const userWorkoutsRef = ref(db, 'users/' + userUid + '/weeklyWorkouts');
    set(userWorkoutsRef, weeklyWorkouts)
      .then(() => {
         console.log("'Done' statuses reset and saved to Firebase.");
         // Update the last date in local storage AFTER successful Firebase save
         localStorage.setItem(`lastWorkoutDate_${userUid}`, today);
      })
      .catch(error => console.error("Error resetting done statuses:", error));

  }
}

// --- Timer Modals (Keep existing functionality) ---
openTimer.addEventListener('click', () => {
  timerModal.style.display = 'block';
});

closeTimer.addEventListener('click', () => {
  timerModal.style.display = 'none';
});

// ----- Timer Functionality (unchanged) -----
function updateDisplay() {
  const totalSeconds = Math.floor(elapsedTime / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const hundredths = String(Math.floor((elapsedTime % 1000) / 10)).padStart(2, '0');
  timerDisplay.innerText = `${hours}:${minutes}:${seconds}.${hundredths}`;
}

function startStopwatch() {
  const startTime = Date.now() - elapsedTime;
  timerInterval = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    updateDisplay();
  }, 10);
}

function pauseStopwatch() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetStopwatch() {
  pauseStopwatch();
  elapsedTime = 0;
  updateDisplay();
  toggleTimer.classList.remove('pause');
  toggleTimer.innerText = 'Start';
}

toggleTimer.addEventListener('click', () => {
  if (timerInterval === null) {
    startStopwatch();
    toggleTimer.innerText = 'Pause';
    toggleTimer.classList.add('pause');
  } else {
    pauseStopwatch();
    toggleTimer.innerText = 'Start';
    toggleTimer.classList.remove('pause');
  }
});

resetTimer.addEventListener('click', () => {
  resetStopwatch();
});

// ----- Toggle Between Strength and Cardio Forms -----
function showStrength() {
  strengthButton.classList.add('active');
  cardioButton.classList.remove('active');
  workoutForm.style.display = 'flex';
  cardioForm.style.display = 'none';
}

function showCardio() {
  cardioButton.classList.add('active');
  strengthButton.classList.remove('active');
  cardioForm.style.display = 'flex';
  workoutForm.style.display = 'none';
}

strengthButton.addEventListener('click', showStrength);
cardioButton.addEventListener('click', showCardio);

// --- Logout Button ---
document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth));

// --- Copyright Year ---
document.getElementById('copyrightYear').textContent = new Date().getFullYear(); // Update copyright year dynamically

// --- Visitor Counter (Keep as is, it's external) ---
// The visitor counter is handled by the external image link. No changes needed here.